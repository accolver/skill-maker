package cloudevents

import (
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// MaxWireSize is the maximum recommended wire size for safe intermediary
// forwarding per the CloudEvents v1.0 spec (64 KB).
const MaxWireSize = 64 * 1024

// CloudEvent represents a CloudEvents v1.0 event in JSON structured mode.
// All context attributes are top-level fields. Extension attributes are stored
// in the Extensions map and serialized as top-level JSON properties (NOT nested
// under an "extensions" key).
type CloudEvent struct {
	// REQUIRED attributes
	SpecVersion string `json:"specversion"`
	ID          string `json:"id"`
	Source      string `json:"source"`
	Type        string `json:"type"`

	// OPTIONAL attributes
	DataContentType string `json:"datacontenttype,omitempty"`
	DataSchema      string `json:"dataschema,omitempty"`
	Subject         string `json:"subject,omitempty"`
	Time            string `json:"time,omitempty"`

	// Data fields — mutually exclusive
	Data       interface{} `json:"data,omitempty"`
	DataBase64 *string     `json:"data_base64,omitempty"`

	// Extension attributes (lowercase alphanumeric, max 20 chars)
	Extensions map[string]interface{} `json:"-"`
}

// knownAttributes is the set of attribute names defined by the CloudEvents spec.
// Any top-level JSON key not in this set is treated as an extension attribute.
var knownAttributes = map[string]bool{
	"specversion":     true,
	"id":              true,
	"source":          true,
	"type":            true,
	"datacontenttype": true,
	"dataschema":      true,
	"subject":         true,
	"time":            true,
	"data":            true,
	"data_base64":     true,
}

// extensionNameRegex enforces the CloudEvents extension naming rule:
// lowercase a-z and digits 0-9 only.
var extensionNameRegex = regexp.MustCompile(`^[a-z0-9]+$`)

// rfc2046MediaTypeRegex is a simplified check for RFC 2046 media types.
// Matches patterns like "type/subtype" with optional parameters.
var rfc2046MediaTypeRegex = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*`)

// ValidationError represents a single validation failure with a human-readable
// message identifying which attribute or rule was violated.
type ValidationError struct {
	// Field is the attribute name or rule that failed validation.
	Field string
	// Message describes the validation failure.
	Message string
}

// Error implements the error interface.
func (e ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// ValidateCloudEvent checks whether the given CloudEvent struct conforms to the
// CloudEvents v1.0 specification. It validates:
//
//   - All REQUIRED attributes (specversion, id, source, type)
//   - OPTIONAL attribute formats (time as RFC 3339, datacontenttype as RFC 2046,
//     dataschema as absolute URI)
//   - Extension attribute naming rules (lowercase a-z + digits 0-9, max 20 chars)
//   - Mutual exclusivity of data and data_base64
//   - Wire size does not exceed 64 KB
//
// Returns a slice of ValidationError. An empty slice means the event is valid.
func ValidateCloudEvent(event CloudEvent) []ValidationError {
	var errs []ValidationError

	// ---------------------------------------------------------------
	// 1. REQUIRED attributes
	// ---------------------------------------------------------------

	// specversion MUST be the string "1.0" (not a number, not empty)
	if event.SpecVersion == "" {
		errs = append(errs, ValidationError{
			Field:   "specversion",
			Message: "REQUIRED attribute is missing",
		})
	} else if event.SpecVersion != "1.0" {
		errs = append(errs, ValidationError{
			Field:   "specversion",
			Message: fmt.Sprintf("must be the string \"1.0\", got %q", event.SpecVersion),
		})
	}

	// id MUST be a non-empty string
	if event.ID == "" {
		errs = append(errs, ValidationError{
			Field:   "id",
			Message: "REQUIRED attribute is missing or empty",
		})
	}

	// source MUST be a non-empty URI-reference
	if event.Source == "" {
		errs = append(errs, ValidationError{
			Field:   "source",
			Message: "REQUIRED attribute is missing or empty",
		})
	} else {
		// Validate as URI-reference per RFC 3986 §4.1
		_, err := url.Parse(event.Source)
		if err != nil {
			errs = append(errs, ValidationError{
				Field:   "source",
				Message: fmt.Sprintf("must be a valid URI-reference: %v", err),
			})
		}
	}

	// type MUST be a non-empty string
	if event.Type == "" {
		errs = append(errs, ValidationError{
			Field:   "type",
			Message: "REQUIRED attribute is missing or empty",
		})
	}

	// ---------------------------------------------------------------
	// 2. OPTIONAL attributes
	// ---------------------------------------------------------------

	// time (if present) MUST be RFC 3339 format
	if event.Time != "" {
		if _, err := time.Parse(time.RFC3339, event.Time); err != nil {
			// Also try RFC 3339 with nanoseconds
			if _, err2 := time.Parse(time.RFC3339Nano, event.Time); err2 != nil {
				errs = append(errs, ValidationError{
					Field:   "time",
					Message: fmt.Sprintf("must be RFC 3339 format (e.g., 2024-01-15T09:30:00Z), got %q", event.Time),
				})
			}
		}
	}

	// datacontenttype (if present) MUST be a valid RFC 2046 media type
	if event.DataContentType != "" {
		if !rfc2046MediaTypeRegex.MatchString(event.DataContentType) {
			errs = append(errs, ValidationError{
				Field:   "datacontenttype",
				Message: fmt.Sprintf("must be a valid RFC 2046 media type (e.g., application/json), got %q", event.DataContentType),
			})
		}
	}

	// dataschema (if present) MUST be a non-empty absolute URI
	if event.DataSchema != "" {
		u, err := url.Parse(event.DataSchema)
		if err != nil {
			errs = append(errs, ValidationError{
				Field:   "dataschema",
				Message: fmt.Sprintf("must be a valid absolute URI: %v", err),
			})
		} else if !u.IsAbs() {
			errs = append(errs, ValidationError{
				Field:   "dataschema",
				Message: fmt.Sprintf("must be an absolute URI (with scheme), got %q", event.DataSchema),
			})
		}
	}

	// ---------------------------------------------------------------
	// 3. data and data_base64 mutual exclusivity
	// ---------------------------------------------------------------
	if event.Data != nil && event.DataBase64 != nil {
		errs = append(errs, ValidationError{
			Field:   "data/data_base64",
			Message: "data and data_base64 are mutually exclusive; only one may be present",
		})
	}

	// ---------------------------------------------------------------
	// 4. Extension attribute naming rules
	// ---------------------------------------------------------------
	for name := range event.Extensions {
		if knownAttributes[name] {
			// This is a known attribute that ended up in Extensions — not an
			// extension attribute. Skip naming validation but note the conflict.
			errs = append(errs, ValidationError{
				Field:   name,
				Message: "known attribute found in extensions map; use the dedicated struct field instead",
			})
			continue
		}

		if !extensionNameRegex.MatchString(name) {
			errs = append(errs, ValidationError{
				Field:   name,
				Message: fmt.Sprintf("extension attribute name must contain only lowercase a-z and digits 0-9, got %q", name),
			})
		}

		if len(name) > 20 {
			errs = append(errs, ValidationError{
				Field:   name,
				Message: fmt.Sprintf("extension attribute name must not exceed 20 characters, got %d", len(name)),
			})
		}
	}

	// ---------------------------------------------------------------
	// 5. Wire size check (≤ 64 KB)
	// ---------------------------------------------------------------
	wireSize, err := estimateWireSize(event)
	if err == nil && wireSize > MaxWireSize {
		errs = append(errs, ValidationError{
			Field:   "wiresize",
			Message: fmt.Sprintf("event wire size (%d bytes) exceeds the 64 KB limit (%d bytes) for safe intermediary forwarding", wireSize, MaxWireSize),
		})
	}

	return errs
}

// ValidateCloudEventJSON validates a raw JSON byte slice as a CloudEvent.
// This is useful when you receive a JSON payload and want to validate it
// without first unmarshaling into a CloudEvent struct. It catches issues
// like specversion being a JSON number instead of a string.
func ValidateCloudEventJSON(raw []byte) []ValidationError {
	var errs []ValidationError

	// First, check wire size on the raw bytes
	if len(raw) > MaxWireSize {
		errs = append(errs, ValidationError{
			Field:   "wiresize",
			Message: fmt.Sprintf("event wire size (%d bytes) exceeds the 64 KB limit (%d bytes) for safe intermediary forwarding", len(raw), MaxWireSize),
		})
	}

	// Parse into a generic map to inspect types before struct unmarshaling
	var rawMap map[string]json.RawMessage
	if err := json.Unmarshal(raw, &rawMap); err != nil {
		errs = append(errs, ValidationError{
			Field:   "json",
			Message: fmt.Sprintf("invalid JSON: %v", err),
		})
		return errs
	}

	// Check that specversion is a string, not a number
	if svRaw, ok := rawMap["specversion"]; ok {
		var svString string
		if err := json.Unmarshal(svRaw, &svString); err != nil {
			// It might be a number — common mistake
			var svNumber float64
			if numErr := json.Unmarshal(svRaw, &svNumber); numErr == nil {
				errs = append(errs, ValidationError{
					Field:   "specversion",
					Message: fmt.Sprintf("must be a JSON string \"1.0\", not a number %v", svNumber),
				})
			} else {
				errs = append(errs, ValidationError{
					Field:   "specversion",
					Message: fmt.Sprintf("must be a JSON string, got invalid type: %s", string(svRaw)),
				})
			}
		}
	}

	// Check that data and data_base64 are not both present
	_, hasData := rawMap["data"]
	_, hasDataBase64 := rawMap["data_base64"]
	if hasData && hasDataBase64 {
		errs = append(errs, ValidationError{
			Field:   "data/data_base64",
			Message: "data and data_base64 are mutually exclusive; only one may be present",
		})
	}

	// Validate extension attribute names from the raw JSON keys
	for key := range rawMap {
		if knownAttributes[key] {
			continue
		}
		// This is an extension attribute — validate its name
		if !extensionNameRegex.MatchString(key) {
			errs = append(errs, ValidationError{
				Field:   key,
				Message: fmt.Sprintf("extension attribute name must contain only lowercase a-z and digits 0-9, got %q", key),
			})
		}
		if len(key) > 20 {
			errs = append(errs, ValidationError{
				Field:   key,
				Message: fmt.Sprintf("extension attribute name must not exceed 20 characters, got %d", len(key)),
			})
		}
	}

	// Now unmarshal into the struct for remaining validation
	var event CloudEvent
	if err := json.Unmarshal(raw, &event); err != nil {
		errs = append(errs, ValidationError{
			Field:   "json",
			Message: fmt.Sprintf("failed to unmarshal CloudEvent: %v", err),
		})
		return errs
	}

	// Parse extensions from raw map
	event.Extensions = make(map[string]interface{})
	for key, val := range rawMap {
		if !knownAttributes[key] {
			var v interface{}
			_ = json.Unmarshal(val, &v)
			event.Extensions[key] = v
		}
	}

	// Handle data_base64 explicitly since the struct uses a pointer
	if hasDataBase64 {
		var db64 string
		if err := json.Unmarshal(rawMap["data_base64"], &db64); err == nil {
			event.DataBase64 = &db64
		}
	}

	// Run struct-level validation (skip extension name checks since we already
	// did them above from the raw JSON, and skip wire size since we checked raw)
	structErrs := ValidateCloudEvent(event)
	for _, e := range structErrs {
		// Avoid duplicate extension name errors and wire size errors
		if strings.HasPrefix(e.Field, "wiresize") {
			continue
		}
		isDuplicateExtErr := false
		for _, existing := range errs {
			if existing.Field == e.Field && strings.Contains(e.Message, "extension attribute name") {
				isDuplicateExtErr = true
				break
			}
		}
		if isDuplicateExtErr {
			continue
		}
		errs = append(errs, e)
	}

	return errs
}

// estimateWireSize computes an approximate JSON wire size for the event by
// marshaling it to JSON. This includes context attributes, extensions, and data.
func estimateWireSize(event CloudEvent) (int, error) {
	// Build a map that includes both struct fields and extensions for accurate
	// size estimation (extensions are top-level in JSON, not nested).
	m := make(map[string]interface{})

	m["specversion"] = event.SpecVersion
	m["id"] = event.ID
	m["source"] = event.Source
	m["type"] = event.Type

	if event.DataContentType != "" {
		m["datacontenttype"] = event.DataContentType
	}
	if event.DataSchema != "" {
		m["dataschema"] = event.DataSchema
	}
	if event.Subject != "" {
		m["subject"] = event.Subject
	}
	if event.Time != "" {
		m["time"] = event.Time
	}
	if event.Data != nil {
		m["data"] = event.Data
	}
	if event.DataBase64 != nil {
		m["data_base64"] = *event.DataBase64
	}

	for k, v := range event.Extensions {
		m[k] = v
	}

	b, err := json.Marshal(m)
	if err != nil {
		return 0, err
	}

	return len(b), nil
}

// IsValid is a convenience function that returns true if the event has no
// validation errors.
func IsValid(event CloudEvent) bool {
	return len(ValidateCloudEvent(event)) == 0
}

// IsValidJSON is a convenience function that returns true if the raw JSON
// CloudEvent has no validation errors.
func IsValidJSON(raw []byte) bool {
	return len(ValidateCloudEventJSON(raw)) == 0
}

// FormatErrors returns a human-readable multi-line string of all validation
// errors, suitable for logging or error responses.
func FormatErrors(errs []ValidationError) string {
	if len(errs) == 0 {
		return "event is valid"
	}

	var b strings.Builder
	b.WriteString(fmt.Sprintf("CloudEvent validation failed with %d error(s):\n", len(errs)))
	for i, e := range errs {
		b.WriteString(fmt.Sprintf("  %d. [%s] %s\n", i+1, e.Field, e.Message))
	}
	return b.String()
}
