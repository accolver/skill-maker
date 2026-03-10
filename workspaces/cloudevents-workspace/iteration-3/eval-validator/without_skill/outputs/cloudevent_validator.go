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

// CloudEvent represents a CloudEvents v1.0 specification event.
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
	DataBase64 interface{} `json:"data_base64,omitempty"`

	// Extensions holds any extension attributes
	Extensions map[string]interface{} `json:"-"`
}

// ValidationError represents a single validation error with a field reference and message.
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Error implements the error interface.
func (ve ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", ve.Field, ve.Message)
}

// ValidationResult holds the complete result of validating a CloudEvent.
type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Errors []ValidationError `json:"errors"`
}

// extensionNameRegex enforces the CloudEvents v1.0 extension naming rule:
// lowercase letters and digits only, must start with a letter, length 1-20.
var extensionNameRegex = regexp.MustCompile(`^[a-z][a-z0-9]{0,19}$`)

// reservedAttributes are the context attribute names defined by the spec.
// Extension attributes must not use these names.
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

// Validate checks whether the CloudEvent conforms to the CloudEvents v1.0 specification.
// It returns a ValidationResult containing a list of all validation errors found.
func Validate(event CloudEvent) ValidationResult {
	var errors []ValidationError

	// 1. Validate required attributes
	errors = append(errors, validateRequiredAttributes(event)...)

	// 2. Validate specversion value
	errors = append(errors, validateSpecVersion(event)...)

	// 3. Validate source is a valid URI-reference
	errors = append(errors, validateSource(event)...)

	// 4. Validate optional URI attributes
	errors = append(errors, validateOptionalURIAttributes(event)...)

	// 5. Validate time format (RFC 3339)
	errors = append(errors, validateTime(event)...)

	// 6. Validate data and data_base64 mutual exclusivity
	errors = append(errors, validateDataFields(event)...)

	// 7. Validate extension attribute names
	errors = append(errors, validateExtensions(event)...)

	// 8. Validate wire size
	errors = append(errors, validateWireSize(event)...)

	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateJSON validates a raw JSON byte slice as a CloudEvent.
// It first unmarshals the JSON, then runs all validation checks.
func ValidateJSON(data []byte) ValidationResult {
	var errors []ValidationError

	// Check wire size first on the raw bytes
	if len(data) > MaxWireSize {
		errors = append(errors, ValidationError{
			Field:   "(wire)",
			Message: fmt.Sprintf("event wire size %d bytes exceeds maximum of %d bytes (64KB)", len(data), MaxWireSize),
		})
	}

	// Unmarshal into a raw map to capture extensions
	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		errors = append(errors, ValidationError{
			Field:   "(json)",
			Message: fmt.Sprintf("invalid JSON: %v", err),
		})
		return ValidationResult{Valid: false, Errors: errors}
	}

	// Build the CloudEvent struct from the raw map
	event := CloudEvent{
		Extensions: make(map[string]interface{}),
	}

	if v, ok := raw["id"]; ok {
		if s, ok := v.(string); ok {
			event.ID = s
		}
	}
	if v, ok := raw["source"]; ok {
		if s, ok := v.(string); ok {
			event.Source = s
		}
	}
	if v, ok := raw["specversion"]; ok {
		if s, ok := v.(string); ok {
			event.SpecVersion = s
		}
	}
	if v, ok := raw["type"]; ok {
		if s, ok := v.(string); ok {
			event.Type = s
		}
	}
	if v, ok := raw["datacontenttype"]; ok {
		if s, ok := v.(string); ok {
			event.DataContentType = s
		}
	}
	if v, ok := raw["dataschema"]; ok {
		if s, ok := v.(string); ok {
			event.DataSchema = s
		}
	}
	if v, ok := raw["subject"]; ok {
		if s, ok := v.(string); ok {
			event.Subject = s
		}
	}
	if v, ok := raw["time"]; ok {
		if s, ok := v.(string); ok {
			event.Time = s
		}
	}
	if v, ok := raw["data"]; ok {
		event.Data = v
	}
	if v, ok := raw["data_base64"]; ok {
		event.DataBase64 = v
	}

	// Collect extension attributes (anything not in the reserved set)
	for key, val := range raw {
		if !reservedAttributes[key] {
			event.Extensions[key] = val
		}
	}

	// Run struct-level validation (skip wire size since we already checked raw bytes)
	var structErrors []ValidationError
	structErrors = append(structErrors, validateRequiredAttributes(event)...)
	structErrors = append(structErrors, validateSpecVersion(event)...)
	structErrors = append(structErrors, validateSource(event)...)
	structErrors = append(structErrors, validateOptionalURIAttributes(event)...)
	structErrors = append(structErrors, validateTime(event)...)
	structErrors = append(structErrors, validateDataFields(event)...)
	structErrors = append(structErrors, validateExtensions(event)...)

	errors = append(errors, structErrors...)

	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// validateRequiredAttributes checks that all REQUIRED CloudEvents attributes are present and non-empty.
func validateRequiredAttributes(event CloudEvent) []ValidationError {
	var errors []ValidationError

	if strings.TrimSpace(event.ID) == "" {
		errors = append(errors, ValidationError{
			Field:   "id",
			Message: "REQUIRED attribute 'id' is missing or empty",
		})
	}

	if strings.TrimSpace(event.Source) == "" {
		errors = append(errors, ValidationError{
			Field:   "source",
			Message: "REQUIRED attribute 'source' is missing or empty",
		})
	}

	if strings.TrimSpace(event.SpecVersion) == "" {
		errors = append(errors, ValidationError{
			Field:   "specversion",
			Message: "REQUIRED attribute 'specversion' is missing or empty",
		})
	}

	if strings.TrimSpace(event.Type) == "" {
		errors = append(errors, ValidationError{
			Field:   "type",
			Message: "REQUIRED attribute 'type' is missing or empty",
		})
	}

	return errors
}

// validateSpecVersion checks that specversion is exactly "1.0".
func validateSpecVersion(event CloudEvent) []ValidationError {
	var errors []ValidationError

	if event.SpecVersion != "" && event.SpecVersion != "1.0" {
		errors = append(errors, ValidationError{
			Field:   "specversion",
			Message: fmt.Sprintf("specversion must be '1.0', got '%s'", event.SpecVersion),
		})
	}

	return errors
}

// validateSource checks that the source attribute is a valid URI-reference (RFC 3986).
func validateSource(event CloudEvent) []ValidationError {
	var errors []ValidationError

	if event.Source == "" {
		return errors // Already caught by required attribute check
	}

	// The source MUST be a non-empty URI-reference.
	// A URI-reference can be a relative reference or an absolute URI.
	// We use url.Parse which accepts both forms.
	if _, err := url.Parse(event.Source); err != nil {
		errors = append(errors, ValidationError{
			Field:   "source",
			Message: fmt.Sprintf("source must be a valid URI-reference (RFC 3986): %v", err),
		})
	}

	return errors
}

// validateOptionalURIAttributes validates dataschema (if set) is a valid absolute URI.
func validateOptionalURIAttributes(event CloudEvent) []ValidationError {
	var errors []ValidationError

	if event.DataSchema != "" {
		u, err := url.Parse(event.DataSchema)
		if err != nil {
			errors = append(errors, ValidationError{
				Field:   "dataschema",
				Message: fmt.Sprintf("dataschema must be a valid URI: %v", err),
			})
		} else if !u.IsAbs() {
			errors = append(errors, ValidationError{
				Field:   "dataschema",
				Message: "dataschema must be an absolute URI (must include a scheme)",
			})
		}
	}

	if event.DataContentType != "" {
		// RFC 2046 media type: must contain a '/' separator at minimum
		if !strings.Contains(event.DataContentType, "/") {
			errors = append(errors, ValidationError{
				Field:   "datacontenttype",
				Message: fmt.Sprintf("datacontenttype must be a valid RFC 2046 media type, got '%s'", event.DataContentType),
			})
		}
	}

	if event.Subject != "" {
		if !utf8.ValidString(event.Subject) {
			errors = append(errors, ValidationError{
				Field:   "subject",
				Message: "subject must be a valid UTF-8 string",
			})
		}
	}

	return errors
}

// validateTime checks that the time attribute, if present, is a valid RFC 3339 timestamp.
func validateTime(event CloudEvent) []ValidationError {
	var errors []ValidationError

	if event.Time == "" {
		return errors
	}

	// Try parsing with RFC 3339 / RFC 3339 Nano
	_, err := time.Parse(time.RFC3339, event.Time)
	if err != nil {
		_, err2 := time.Parse(time.RFC3339Nano, event.Time)
		if err2 != nil {
			errors = append(errors, ValidationError{
				Field:   "time",
				Message: fmt.Sprintf("time must be a valid RFC 3339 timestamp, got '%s': %v", event.Time, err),
			})
		}
	}

	return errors
}

// validateDataFields checks that data and data_base64 are not both set simultaneously.
func validateDataFields(event CloudEvent) []ValidationError {
	var errors []ValidationError

	hasData := event.Data != nil
	hasDataBase64 := event.DataBase64 != nil

	if hasData && hasDataBase64 {
		errors = append(errors, ValidationError{
			Field:   "data/data_base64",
			Message: "event MUST NOT include both 'data' and 'data_base64' attributes simultaneously",
		})
	}

	// If data_base64 is set, it must be a string (base64-encoded)
	if hasDataBase64 {
		if _, ok := event.DataBase64.(string); !ok {
			errors = append(errors, ValidationError{
				Field:   "data_base64",
				Message: "data_base64 must be a string containing base64-encoded data",
			})
		}
	}

	return errors
}

// validateExtensions checks that all extension attribute names conform to the
// CloudEvents v1.0 naming rules:
//   - Must consist of only lowercase letters ('a'-'z') and digits ('0'-'9')
//   - Must start with a lowercase letter
//   - Must be between 1 and 20 characters long
//   - Must not use names reserved by the spec
func validateExtensions(event CloudEvent) []ValidationError {
	var errors []ValidationError

	for name, val := range event.Extensions {
		// Check for reserved attribute names used as extensions
		if reservedAttributes[strings.ToLower(name)] {
			errors = append(errors, ValidationError{
				Field:   fmt.Sprintf("extensions.%s", name),
				Message: fmt.Sprintf("extension attribute '%s' conflicts with a reserved attribute name", name),
			})
			continue
		}

		// Check naming rules
		if !extensionNameRegex.MatchString(name) {
			reasons := describeNamingViolation(name)
			errors = append(errors, ValidationError{
				Field:   fmt.Sprintf("extensions.%s", name),
				Message: fmt.Sprintf("extension attribute name '%s' violates naming rules: %s (must be 1-20 lowercase letters/digits, starting with a letter)", name, reasons),
			})
		}

		// Extension values must not be nil
		if val == nil {
			errors = append(errors, ValidationError{
				Field:   fmt.Sprintf("extensions.%s", name),
				Message: fmt.Sprintf("extension attribute '%s' has a nil value", name),
			})
		}
	}

	return errors
}

// describeNamingViolation returns a human-readable description of why an extension name is invalid.
func describeNamingViolation(name string) string {
	var reasons []string

	if len(name) == 0 {
		return "name is empty"
	}

	if len(name) > 20 {
		reasons = append(reasons, fmt.Sprintf("length %d exceeds maximum of 20", len(name)))
	}

	firstRune, _ := utf8.DecodeRuneInString(name)
	if !unicode.IsLower(firstRune) || !unicode.IsLetter(firstRune) {
		reasons = append(reasons, "must start with a lowercase letter")
	}

	for _, r := range name {
		if r >= 'A' && r <= 'Z' {
			reasons = append(reasons, "contains uppercase letters")
			break
		}
	}

	for _, r := range name {
		if !unicode.IsLetter(r) && !unicode.IsDigit(r) {
			reasons = append(reasons, fmt.Sprintf("contains invalid character '%c'", r))
			break
		}
	}

	if len(reasons) == 0 {
		reasons = append(reasons, "does not match required pattern [a-z][a-z0-9]{0,19}")
	}

	return strings.Join(reasons, "; ")
}

// validateWireSize estimates the JSON wire size of the event and checks against the 64KB limit.
func validateWireSize(event CloudEvent) []ValidationError {
	var errors []ValidationError

	// Marshal the event to JSON to measure wire size
	// Build a map representation for accurate size measurement
	wireMap := map[string]interface{}{
		"specversion": event.SpecVersion,
		"id":          event.ID,
		"source":      event.Source,
		"type":        event.Type,
	}

	if event.DataContentType != "" {
		wireMap["datacontenttype"] = event.DataContentType
	}
	if event.DataSchema != "" {
		wireMap["dataschema"] = event.DataSchema
	}
	if event.Subject != "" {
		wireMap["subject"] = event.Subject
	}
	if event.Time != "" {
		wireMap["time"] = event.Time
	}
	if event.Data != nil {
		wireMap["data"] = event.Data
	}
	if event.DataBase64 != nil {
		wireMap["data_base64"] = event.DataBase64
	}

	for k, v := range event.Extensions {
		wireMap[k] = v
	}

	jsonBytes, err := json.Marshal(wireMap)
	if err != nil {
		errors = append(errors, ValidationError{
			Field:   "(wire)",
			Message: fmt.Sprintf("failed to marshal event for wire size check: %v", err),
		})
		return errors
	}

	if len(jsonBytes) > MaxWireSize {
		errors = append(errors, ValidationError{
			Field:   "(wire)",
			Message: fmt.Sprintf("event wire size %d bytes exceeds maximum of %d bytes (64KB)", len(jsonBytes), MaxWireSize),
		})
	}

	return errors
}
