package cloudevents

import (
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

// MaxWireSize is the maximum recommended wire size for safe intermediary
// forwarding per the CloudEvents v1.0 spec (64 KB).
const MaxWireSize = 64 * 1024

// CloudEvent represents a CloudEvents v1.0 event in JSON structured format.
// All context attributes and data are stored in a single JSON object.
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

// ValidationError describes a single spec-compliance violation.
type ValidationError struct {
	// Field is the attribute name that failed validation (e.g. "specversion",
	// "id", "extensions.myext").
	Field string `json:"field"`
	// Message describes the violation.
	Message string `json:"message"`
}

// Error implements the error interface.
func (ve ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", ve.Field, ve.Message)
}

// knownAttributes lists all spec-defined attribute names. Any top-level JSON
// key not in this set is treated as an extension attribute.
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

// extensionNameRe matches valid extension attribute names: lowercase a-z and
// digits 0-9 only, between 1 and 20 characters.
var extensionNameRe = regexp.MustCompile(`^[a-z0-9]{1,20}$`)

// rfc2046MediaTypeRe is a simplified check for RFC 2046 media types:
// type/subtype with optional parameters.
var rfc2046MediaTypeRe = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*`)

// Validate checks whether the given CloudEvent conforms to the CloudEvents
// v1.0 specification. It returns a slice of ValidationError describing every
// violation found. An empty slice means the event is valid.
//
// Checks performed:
//   - All four REQUIRED attributes present and correctly typed
//   - specversion is exactly the string "1.0"
//   - id is a non-empty string
//   - source is a non-empty, valid URI-reference
//   - type is a non-empty string
//   - time (if present) is valid RFC 3339
//   - datacontenttype (if present) looks like a valid RFC 2046 media type
//   - dataschema (if present) is a non-empty absolute URI
//   - Extension attribute names are lowercase alphanumeric, max 20 chars
//   - data and data_base64 are not both present
//   - Estimated wire size does not exceed 64 KB
func Validate(event CloudEvent) []ValidationError {
	var errs []ValidationError

	// ── REQUIRED: specversion ──────────────────────────────────────────
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

	// ── REQUIRED: id ───────────────────────────────────────────────────
	if event.ID == "" {
		errs = append(errs, ValidationError{
			Field:   "id",
			Message: "REQUIRED attribute is missing or empty",
		})
	}

	// ── REQUIRED: source ───────────────────────────────────────────────
	if event.Source == "" {
		errs = append(errs, ValidationError{
			Field:   "source",
			Message: "REQUIRED attribute is missing or empty",
		})
	} else if _, err := url.Parse(event.Source); err != nil {
		errs = append(errs, ValidationError{
			Field:   "source",
			Message: fmt.Sprintf("must be a valid URI-reference: %v", err),
		})
	}

	// ── REQUIRED: type ─────────────────────────────────────────────────
	if event.Type == "" {
		errs = append(errs, ValidationError{
			Field:   "type",
			Message: "REQUIRED attribute is missing or empty",
		})
	}

	// ── OPTIONAL: time ─────────────────────────────────────────────────
	if event.Time != "" {
		if _, err := time.Parse(time.RFC3339, event.Time); err != nil {
			// Also try RFC3339Nano for sub-second precision timestamps.
			if _, err2 := time.Parse(time.RFC3339Nano, event.Time); err2 != nil {
				errs = append(errs, ValidationError{
					Field:   "time",
					Message: fmt.Sprintf("must be RFC 3339 format: %v", err),
				})
			}
		}
	}

	// ── OPTIONAL: datacontenttype ──────────────────────────────────────
	if event.DataContentType != "" {
		if !rfc2046MediaTypeRe.MatchString(event.DataContentType) {
			errs = append(errs, ValidationError{
				Field:   "datacontenttype",
				Message: fmt.Sprintf("must be a valid RFC 2046 media type, got %q", event.DataContentType),
			})
		}
	}

	// ── OPTIONAL: dataschema ───────────────────────────────────────────
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
				Message: "must be an absolute URI (has scheme), got a relative reference",
			})
		}
	}

	// ── Mutual exclusion: data vs data_base64 ──────────────────────────
	if event.Data != nil && event.DataBase64 != nil {
		errs = append(errs, ValidationError{
			Field:   "data/data_base64",
			Message: "data and data_base64 are mutually exclusive; only one may be present",
		})
	}

	// ── Extension attribute naming rules ───────────────────────────────
	for name := range event.Extensions {
		fieldLabel := fmt.Sprintf("extensions.%s", name)
		if knownAttributes[name] {
			errs = append(errs, ValidationError{
				Field:   fieldLabel,
				Message: fmt.Sprintf("%q is a spec-defined attribute and must not appear as an extension", name),
			})
			continue
		}
		if !extensionNameRe.MatchString(name) {
			if len(name) > 20 {
				errs = append(errs, ValidationError{
					Field:   fieldLabel,
					Message: fmt.Sprintf("extension attribute name exceeds 20 characters (length %d); must be lowercase a-z and digits 0-9 only, max 20 chars", utf8.RuneCountInString(name)),
				})
			} else {
				errs = append(errs, ValidationError{
					Field:   fieldLabel,
					Message: "extension attribute name must contain only lowercase a-z and digits 0-9, max 20 chars",
				})
			}
		}
	}

	// ── Wire size estimate ─────────────────────────────────────────────
	wireSize := estimateWireSize(event)
	if wireSize > MaxWireSize {
		errs = append(errs, ValidationError{
			Field:   "wiresize",
			Message: fmt.Sprintf("estimated wire size %d bytes exceeds 64 KB (%d bytes) limit for safe intermediary forwarding", wireSize, MaxWireSize),
		})
	}

	return errs
}

// ValidateJSON parses raw JSON bytes into a CloudEvent (including extension
// attributes) and validates it. This is the preferred entry point when you
// have a JSON payload, because it also catches specversion-as-number and
// properly extracts extension attributes from the top-level JSON object.
func ValidateJSON(raw []byte) (CloudEvent, []ValidationError) {
	var errs []ValidationError

	// First, decode into a generic map to inspect raw types and discover
	// extension attributes.
	var rawMap map[string]json.RawMessage
	if err := json.Unmarshal(raw, &rawMap); err != nil {
		return CloudEvent{}, []ValidationError{{
			Field:   "event",
			Message: fmt.Sprintf("invalid JSON: %v", err),
		}}
	}

	// Check specversion is a string, not a number. The JSON decoder would
	// silently coerce 1.0 to "1" in a string field, so we inspect the raw
	// token.
	if svRaw, ok := rawMap["specversion"]; ok {
		sv := strings.TrimSpace(string(svRaw))
		if len(sv) > 0 && sv[0] != '"' {
			errs = append(errs, ValidationError{
				Field:   "specversion",
				Message: fmt.Sprintf("must be a JSON string (e.g. \"1.0\"), got a non-string value: %s", sv),
			})
		}
	}

	// Check data and data_base64 mutual exclusion at the JSON level.
	_, hasData := rawMap["data"]
	_, hasDataBase64 := rawMap["data_base64"]

	// Decode into the struct.
	var event CloudEvent
	if err := json.Unmarshal(raw, &event); err != nil {
		return CloudEvent{}, append(errs, ValidationError{
			Field:   "event",
			Message: fmt.Sprintf("failed to decode CloudEvent: %v", err),
		})
	}

	// Extract extension attributes: any top-level key not in knownAttributes.
	event.Extensions = make(map[string]interface{})
	for key, rawVal := range rawMap {
		if !knownAttributes[key] {
			var val interface{}
			_ = json.Unmarshal(rawVal, &val)
			event.Extensions[key] = val
		}
	}

	// Handle the data_base64 field: the struct uses a *string so we can
	// detect presence vs absence.
	if hasDataBase64 {
		var db64 string
		if err := json.Unmarshal(rawMap["data_base64"], &db64); err == nil {
			event.DataBase64 = &db64
		}
	}

	// If data is present in the raw JSON (even if null), mark it so mutual
	// exclusion check works.
	if hasData && event.Data == nil {
		// data was explicitly null — that's a valid value per spec, but we
		// still need to detect mutual exclusion.
		var placeholder interface{}
		_ = json.Unmarshal(rawMap["data"], &placeholder)
		event.Data = placeholder
		// If placeholder is still nil, data was JSON null. We need a sentinel
		// to distinguish "absent" from "null". Use a special marker.
		if placeholder == nil && hasData {
			event.Data = jsonNull{}
		}
	}

	// Run structural validation.
	structErrs := Validate(event)
	errs = append(errs, structErrs...)

	// Additional JSON-level check: data and data_base64 both present.
	// (Validate() checks the struct fields, but if both JSON keys exist we
	// should flag it even if one decoded to nil.)
	if hasData && hasDataBase64 {
		// Avoid duplicate if Validate already caught it.
		alreadyCaught := false
		for _, e := range errs {
			if e.Field == "data/data_base64" {
				alreadyCaught = true
				break
			}
		}
		if !alreadyCaught {
			errs = append(errs, ValidationError{
				Field:   "data/data_base64",
				Message: "data and data_base64 are mutually exclusive; only one may be present",
			})
		}
	}

	return event, errs
}

// jsonNull is a sentinel type to distinguish JSON null from absent.
type jsonNull struct{}

// estimateWireSize returns a rough estimate of the JSON wire size for the
// event. This is an approximation — the actual wire size depends on the
// transport protocol framing.
func estimateWireSize(event CloudEvent) int {
	// Marshal the core event to JSON for a size estimate.
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
		switch event.Data.(type) {
		case jsonNull:
			m["data"] = nil
		default:
			m["data"] = event.Data
		}
	}
	if event.DataBase64 != nil {
		m["data_base64"] = *event.DataBase64
	}

	for k, v := range event.Extensions {
		m[k] = v
	}

	b, err := json.Marshal(m)
	if err != nil {
		// Fallback: rough estimate from string lengths.
		return 256
	}
	return len(b)
}

// IsValid is a convenience function that returns true if the event has no
// validation errors.
func IsValid(event CloudEvent) bool {
	return len(Validate(event)) == 0
}

// IsValidJSON is a convenience function that returns true if the raw JSON
// represents a valid CloudEvent.
func IsValidJSON(raw []byte) bool {
	_, errs := ValidateJSON(raw)
	return len(errs) == 0
}
