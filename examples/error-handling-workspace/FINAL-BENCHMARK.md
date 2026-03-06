# Final Benchmark: error-handling

## Summary

| Metric                        | Value          |
| ----------------------------- | -------------- |
| Skill Name                    | error-handling |
| Total Iterations              | 3              |
| Final With-Skill Pass Rate    | 100.0%         |
| Final Without-Skill Pass Rate | 8.3%           |
| Final Delta                   | +91.7%         |
| Plateau Iteration             | 3              |
| Avg Time With Skill (s)       | 34.9           |
| Avg Time Without Skill (s)    | 15.0           |
| Avg Tokens With Skill         | 15,800         |
| Avg Tokens Without Skill      | 6,867          |

## Iteration History

| Iteration | With Skill | Without Skill | Delta  | Improvement |
| --------- | ---------- | ------------- | ------ | ----------- |
| 1         | 70.8%      | 4.2%          | +66.6% | -           |
| 2         | 91.7%      | 8.3%          | +83.4% | +20.9%      |
| 3         | 100.0%     | 8.3%          | +91.7% | +8.3%       |

## Per-Eval Final Results (Iteration 3)

| Eval                  | With Skill | Without Skill | Delta   |
| --------------------- | ---------- | ------------- | ------- |
| express-api-errors    | 100.0%     | 12.5%         | +87.5%  |
| python-service-errors | 100.0%     | 0.0%          | +100.0% |
| error-response-schema | 100.0%     | 12.5%         | +87.5%  |

## What the Skill Adds

The without-skill baseline consistently fails on these dimensions:

1. **Unified error taxonomy** — Without the skill, agents create ad-hoc error
   handling with no shared error categories. They use inline `res.status(404)`
   calls with inconsistent response shapes. The skill enforces a taxonomy
   (validation, authentication, authorization, not-found, conflict, rate-limit,
   internal) that maps to HTTP status codes and error code prefixes.

2. **Stable error codes** — Baseline agents use HTTP status codes as the only
   error identifier. The skill requires stable string codes like
   `ERR_NOT_FOUND_USER` that clients can match on programmatically, enabling
   reliable error handling in frontend code and API consumers.

3. **Error class hierarchy** — Without the skill, agents throw raw strings or
   use built-in Error/Exception classes with no structure. The skill produces a
   base AppError class with code, message, statusCode, category, and cause
   properties, plus category-specific subclasses.

4. **User-facing vs internal separation** — Baseline agents leak MongoDB error
   messages, stack traces, and file paths to API consumers. The skill enforces a
   strict boundary: users see only code + message + safe details, while internal
   logs capture the full stack trace, causal chain, and request context.

5. **Correlation IDs** — Without the skill, agents never generate or propagate
   request IDs. The skill requires a correlation ID generated at the edge (with
   UUID fallback), included in every error response and every log entry,
   enabling cross-service debugging.

6. **Structured logging** — Baseline agents use `console.error(err)` or
   `print(f"Error: {e}")`. The skill requires JSON-formatted log entries with
   error code, message, category, correlation ID, request path, stack trace, and
   causal chain.

7. **Error propagation chains** — Without the skill, agents swallow exceptions
   in empty catch blocks or re-raise without preserving the original error. The
   skill enforces "never swallow, always wrap" with the original error as
   `cause`, preserving the full diagnostic chain.

8. **Consistent response format** — Baseline agents produce different error
   response shapes per endpoint. The skill centralizes error-to-response
   conversion in middleware, ensuring every error response follows the same JSON
   schema.

## Skill Improvements Across Iterations

### Iteration 1 -> 2 (70.8% -> 91.7%)

- Added explicit instruction to always generate correlation ID with UUID
  fallback when x-request-id header is missing
- Added instruction to use JSON-formatted structured logging (not console.error
  or print)
- Added minimum count requirement (15+) for error code registry
- Added Retry-After header guidance for rate limit errors
- Strengthened instruction for error code registry to include all 7 categories

### Iteration 2 -> 3 (91.7% -> 100.0%)

- Added explicit instruction to include upstream service name and HTTP status
  code when wrapping external API errors
- Added instruction to document client handling guidance for ALL error
  categories (not just validation and auth)
- Added specific examples of what client handling looks like per category (retry
  logic, re-authenticate, show field errors, etc.)

## Cost Analysis

The skill increases token usage by ~2.3x (15,800 vs 6,867) and time by ~2.3x
(34.9s vs 15.0s). This is expected because comprehensive error handling
requires:

- Defining a full error class hierarchy with multiple subclasses
- Implementing centralized error middleware
- Setting up structured JSON logging
- Creating error propagation patterns with cause chains
- Generating correlation ID infrastructure

The additional cost is justified by the 91.7% improvement in error handling
quality. The without-skill baseline produces error handling that would leak
internal details to users, swallow exceptions, and make production debugging
nearly impossible.

## Plateau Detection

Pass rate reached 100% at iteration 3. The without-skill baseline is stable at
8.3% (only the "generic safe message for 500 errors" assertion passes
consistently without the skill). Further iterations cannot improve the
with-skill rate (already at ceiling) and the without-skill baseline confirms the
assertions are genuinely discriminating — they test for patterns that agents
simply do not produce without explicit instruction.
