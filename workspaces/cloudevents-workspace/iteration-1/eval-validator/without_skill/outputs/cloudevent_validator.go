package cloudevents

import (
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

// MaxWireSize is the recommended maximum size for a CloudEvent on the wire (64KB).
const MaxWireSize = 64 * 1024

// CloudEvent represents a CloudEvents v1.0 structured event.
type CloudEvent struct {
	// Required attributes
	ID          string `json:"id"`
	Source      string `json:"source"`
	SpecVersion string `json:"specversion"`
	Type        string `json:"type"`

	// Optional attributes
	DataContentType string `json:"datacontenttype,omitempty"`
	DataSchema      string `json:"dataschema,omitempty"`
	Subject         string `json:"subject,omitempty"`
	Time            string `json:"time,omitempty"`

	// Data fields — only one of Data or DataBase64 may be set
	Data       interface{} `json:"data,omitempty"`
	DataBase64 string      `json:"data_base64,omitempty"`

	// Extensions holds any extension attributes
	Extensions map[string]interface{} `json:"-"`
}

// ValidationError represents a single validation failure.
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Error implements the error interface.
func (ve ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", ve.Field, ve.Message)
}

// ValidationResult holds all validation errors for a CloudEvent.
type ValidationResult struct {
	Errors []ValidationError `json:"errors"`
}

// IsValid returns true if there are no validation errors.
func (vr *ValidationResult) IsValid() bool {
	return len(vr.Errors) == 0
}

// addError appends a validation error to the result.
func (vr *ValidationResult) addError(field, message string) {
	vr.Errors = append(vr.Errors, ValidationError{
		Field:   field,
		Message: message,
	})
}

// extensionNameRegex enforces the CloudEvents v1.0 extension naming rule:
// lowercase letters and digits only, length 1-20.
var extensionNameRegex = regexp.MustCompile(`^[a-z0-9]+$`)

// Validate checks whether the given CloudEvent conforms to the CloudEvents v1.0
// specification. It returns a ValidationResult containing all detected errors.
//
// Checks performed:
//  1. Required attributes: id, source, specversion, type must be non-empty.
//  2. specversion must equal "1.0".
//  3. source must be a valid URI-reference.
//  4. dataschema, if present, must be a valid URI.
//  5. time, if present, must be a valid RFC 3339 timestamp.
//  6. data and data_base64 must not both be set.
//  7. Extension attribute names must be lowercase alphanumeric, 1-20 chars,
//     and must not collide with spec-defined attribute names.
//  8. The approximate wire size must not exceed 64KB.
func Validate(event CloudEvent) ValidationResult {
	result := ValidationResult{}

	// ── 1. Required attributes ──────────────────────────────────────────
	validateRequiredAttributes(&event, &result)

	// ── 2. specversion ──────────────────────────────────────────────────
	validateSpecVersion(&event, &result)

	// ── 3. source URI-reference ─────────────────────────────────────────
	validateSource(&event, &result)

	// ── 4. Optional URI attributes ──────────────────────────────────────
	validateOptionalURIs(&event, &result)

	// ── 5. time format ──────────────────────────────────────────────────
	validateTime(&event, &result)

	// ── 6. data / data_base64 mutual exclusion ──────────────────────────
	validateDataExclusivity(&event, &result)

	// ── 7. Extension attribute naming ───────────────────────────────────
	validateExtensions(&event, &result)

	// ── 8. Wire size ────────────────────────────────────────────────────
	validateWireSize(&event, &result)

	return result
}

// validateRequiredAttributes checks that all required CloudEvents v1.0
// attributes are present and non-empty.
func validateRequiredAttributes(event *CloudEvent, result *ValidationResult) {
	if strings.TrimSpace(event.ID) == "" {
		result.addError("id", "REQUIRED: must be a non-empty string")
	}
	if strings.TrimSpace(event.Source) == "" {
		result.addError("source", "REQUIRED: must be a non-empty URI-reference")
	}
	if strings.TrimSpace(event.SpecVersion) == "" {
		result.addError("specversion", "REQUIRED: must be a non-empty string")
	}
	if strings.TrimSpace(event.Type) == "" {
		result.addError("type", "REQUIRED: must be a non-empty string")
	}
}

// validateSpecVersion ensures specversion is exactly "1.0".
func validateSpecVersion(event *CloudEvent, result *ValidationResult) {
	if event.SpecVersion != "" && event.SpecVersion != "1.0" {
		result.addError("specversion",
			fmt.Sprintf("must be \"1.0\", got %q", event.SpecVersion))
	}
}

// validateSource checks that the source attribute is a valid URI-reference.
func validateSource(event *CloudEvent, result *ValidationResult) {
	if event.Source == "" {
		return // already caught by required check
	}
	_, err := url.Parse(event.Source)
	if err != nil {
		result.addError("source",
			fmt.Sprintf("must be a valid URI-reference: %v", err))
	}
}

// validateOptionalURIs checks that dataschema (if set) is a valid absolute URI.
func validateOptionalURIs(event *CloudEvent, result *ValidationResult) {
	if event.DataSchema != "" {
		u, err := url.Parse(event.DataSchema)
		if err != nil {
			result.addError("dataschema",
				fmt.Sprintf("must be a valid URI: %v", err))
		} else if u.Scheme == "" {
			result.addError("dataschema",
				"must be an absolute URI (missing scheme)")
		}
	}
}

// validateTime checks that the time attribute, if present, is a valid RFC 3339
// timestamp.
func validateTime(event *CloudEvent, result *ValidationResult) {
	if event.Time == "" {
		return
	}
	_, err := time.Parse(time.RFC3339, event.Time)
	if err != nil {
		// Also try RFC3339Nano for higher precision timestamps
		_, err2 := time.Parse(time.RFC3339Nano, event.Time)
		if err2 != nil {
			result.addError("time",
				fmt.Sprintf("must be a valid RFC 3339 timestamp: %v", err))
		}
	}
}

// validateDataExclusivity ensures that data and data_base64 are not both set.
func validateDataExclusivity(event *CloudEvent, result *ValidationResult) {
	hasData := event.Data != nil
	hasDataBase64 := event.DataBase64 != ""

	if hasData && hasDataBase64 {
		result.addError("data/data_base64",
			"data and data_base64 MUST NOT both be present in the same event")
	}
}

// reservedAttributes are the spec-defined context attribute names that
// extension attributes must not collide with.
var reservedAttributes = map[string]bool{
	"id":              true,
	"source":          true,
	"specversion":     true,
	"type":            true,
	"datacontenttype": true,
	"dataschema":      true,
	"subject":         true,
	"time":            true,
	"data":            true,
	"data_base64":     true,
}

// validateExtensions checks that all extension attribute names conform to the
// CloudEvents v1.0 naming rules:
//   - Must consist of only lowercase ASCII letters ('a'-'z') and digits ('0'-'9')
//   - Must be between 1 and 20 characters in length
//   - Must not collide with spec-defined attribute names
func validateExtensions(event *CloudEvent, result *ValidationResult) {
	for name, value := range event.Extensions {
		// Check length
		if len(name) == 0 {
			result.addError("extensions",
				"extension attribute name must not be empty")
			continue
		}
		if len(name) > 20 {
			result.addError(fmt.Sprintf("extensions[%s]", name),
				fmt.Sprintf("extension attribute name must be at most 20 characters, got %d", len(name)))
		}

		// Check character set: lowercase letters and digits only
		if !extensionNameRegex.MatchString(name) {
			result.addError(fmt.Sprintf("extensions[%s]", name),
				"extension attribute name must contain only lowercase letters (a-z) and digits (0-9)")
		}

		// Check for non-ASCII characters
		for _, r := range name {
			if r > unicode.MaxASCII {
				result.addError(fmt.Sprintf("extensions[%s]", name),
					"extension attribute name must contain only ASCII characters")
				break
			}
		}

		// Check collision with reserved names
		if reservedAttributes[name] {
			result.addError(fmt.Sprintf("extensions[%s]", name),
				fmt.Sprintf("extension attribute name %q conflicts with a spec-defined attribute", name))
		}

		// Validate extension value types per spec:
		// Boolean, Integer, String, Binary, URI, URI-reference, Timestamp
		validateExtensionValue(name, value, result)
	}
}

// validateExtensionValue checks that an extension value is a valid type.
// CloudEvents v1.0 allows: Boolean, Integer, String, Binary (base64 string),
// URI, URI-reference, and Timestamp.
func validateExtensionValue(name string, value interface{}, result *ValidationResult) {
	if value == nil {
		result.addError(fmt.Sprintf("extensions[%s]", name),
			"extension attribute value must not be nil")
		return
	}

	switch value.(type) {
	case bool:
		// Valid: Boolean
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32:
		// Valid: Integer
	case float64:
		// JSON numbers deserialize as float64; accept if it represents an integer
	case string:
		// Valid: String, Binary (base64), URI, URI-reference, Timestamp
	case json.Number:
		// Valid: Integer from json.Decoder with UseNumber
	default:
		result.addError(fmt.Sprintf("extensions[%s]", name),
			fmt.Sprintf("extension attribute value has unsupported type %T; "+
				"must be Boolean, Integer, String, Binary, URI, URI-reference, or Timestamp", value))
	}
}

// validateWireSize estimates the JSON wire size of the event and checks it
// against the 64KB recommendation.
func validateWireSize(event *CloudEvent, result *ValidationResult) {
	size := estimateWireSize(event)
	if size > MaxWireSize {
		result.addError("(wire size)",
			fmt.Sprintf("estimated wire size %d bytes exceeds the recommended maximum of %d bytes (64KB)",
				size, MaxWireSize))
	}
}

// estimateWireSize computes an approximate JSON-serialized size of the event.
func estimateWireSize(event *CloudEvent) int {
	// Build a map representation for JSON marshaling
	m := make(map[string]interface{})

	if event.SpecVersion != "" {
		m["specversion"] = event.SpecVersion
	}
	if event.ID != "" {
		m["id"] = event.ID
	}
	if event.Source != "" {
		m["source"] = event.Source
	}
	if event.Type != "" {
		m["type"] = event.Type
	}
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
	if event.DataBase64 != "" {
		m["data_base64"] = event.DataBase64
	}

	// Merge extensions
	for k, v := range event.Extensions {
		m[k] = v
	}

	b, err := json.Marshal(m)
	if err != nil {
		// Fallback: rough estimate based on string lengths
		return roughEstimate(event)
	}
	return len(b)
}

// roughEstimate provides a fallback size estimate when JSON marshaling fails.
func roughEstimate(event *CloudEvent) int {
	size := 2 // {}
	size += utf8.RuneCountInString(event.ID) + 10
	size += utf8.RuneCountInString(event.Source) + 14
	size += utf8.RuneCountInString(event.SpecVersion) + 18
	size += utf8.RuneCountInString(event.Type) + 10
	size += utf8.RuneCountInString(event.DataContentType) + 22
	size += utf8.RuneCountInString(event.DataSchema) + 18
	size += utf8.RuneCountInString(event.Subject) + 14
	size += utf8.RuneCountInString(event.Time) + 10
	size += utf8.RuneCountInString(event.DataBase64) + 18

	if event.Data != nil {
		if s, ok := event.Data.(string); ok {
			size += utf8.RuneCountInString(s) + 10
		} else {
			b, err := json.Marshal(event.Data)
			if err == nil {
				size += len(b) + 10
			} else {
				size += 100 // arbitrary fallback
			}
		}
	}

	for k, v := range event.Extensions {
		size += len(k) + 6
		if s, ok := v.(string); ok {
			size += utf8.RuneCountInString(s) + 2
		} else {
			b, err := json.Marshal(v)
			if err == nil {
				size += len(b)
			} else {
				size += 20
			}
		}
	}

	return size
}

// ValidateJSON parses a raw JSON byte slice into a CloudEvent (including
// extension attributes) and validates it. This is useful when receiving events
// over the wire in JSON format.
func ValidateJSON(raw []byte) (CloudEvent, ValidationResult) {
	var event CloudEvent

	// First pass: unmarshal known fields
	if err := json.Unmarshal(raw, &event); err != nil {
		result := ValidationResult{}
		result.addError("(json)", fmt.Sprintf("invalid JSON: %v", err))
		return event, result
	}

	// Second pass: extract extension attributes
	var allFields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &allFields); err == nil {
		knownFields := map[string]bool{
			"id": true, "source": true, "specversion": true, "type": true,
			"datacontenttype": true, "dataschema": true, "subject": true,
			"time": true, "data": true, "data_base64": true,
		}
		event.Extensions = make(map[string]interface{})
		for k, v := range allFields {
			if !knownFields[k] {
				var parsed interface{}
				if err := json.Unmarshal(v, &parsed); err == nil {
					event.Extensions[k] = parsed
				} else {
					event.Extensions[k] = string(v)
				}
			}
		}
	}

	// Check raw wire size against the original bytes
	result := Validate(event)

	if len(raw) > MaxWireSize {
		result.addError("(wire size)",
			fmt.Sprintf("raw JSON size %d bytes exceeds the recommended maximum of %d bytes (64KB)",
				len(raw), MaxWireSize))
	}

	return event, result
}
