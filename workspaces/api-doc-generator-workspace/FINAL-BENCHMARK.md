# Final Benchmark: api-doc-generator

## Summary

| Metric                        | Value             |
| ----------------------------- | ----------------- |
| Skill Name                    | api-doc-generator |
| Total Iterations              | 3                 |
| Final With-Skill Pass Rate    | 100.0%            |
| Final Without-Skill Pass Rate | 16.7%             |
| Final Delta                   | +83.3%            |
| Plateau Iteration             | 3                 |
| Avg Time With Skill (s)       | 43.1              |
| Avg Time Without Skill (s)    | 16.9              |
| Avg Tokens With Skill         | 23,367            |
| Avg Tokens Without Skill      | 9,100             |

## Iteration History

| Iteration | With Skill | Without Skill | Delta  | Improvement |
| --------- | ---------- | ------------- | ------ | ----------- |
| 1         | 83.3%      | 12.5%         | +70.8% | -           |
| 2         | 95.8%      | 16.7%         | +79.1% | +12.5%      |
| 3         | 100.0%     | 16.7%         | +83.3% | +4.2%       |

## Per-Eval Final Results (Iteration 3)

| Eval                | With Skill | Without Skill | Delta  |
| ------------------- | ---------- | ------------- | ------ |
| rest-crud-endpoints | 100.0%     | 25.0%         | +75.0% |
| authenticated-api   | 100.0%     | 12.5%         | +87.5% |
| error-handling-api  | 100.0%     | 12.5%         | +87.5% |

## What the Skill Adds

The without-skill baseline consistently fails on these dimensions:

1. **Structured output format** - Without the skill, agents produce only basic
   Markdown with no OpenAPI JSON spec. The skill ensures dual-format output
   (Markdown + OpenAPI 3.0 JSON).

2. **Error response documentation** - Baseline docs mention errors inline
   ("Returns 404 if not found") but never document error response bodies,
   validation error details, or comprehensive status code coverage. The skill
   requires error tables with status codes, conditions, and response body
   examples.

3. **Authentication details** - Without the skill, auth is mentioned briefly but
   not documented per-endpoint. Rate limiting is completely missed. The skill
   ensures auth requirements are marked on every endpoint and rate limits are
   documented.

4. **Request/response examples** - Baseline uses placeholder values ("...") or
   omits examples entirely. The skill requires realistic JSON examples for every
   endpoint including error cases.

5. **Parameter constraints** - Without the skill, parameters are listed by name
   and type but validation rules (min/max, regex, enum values, defaults) are
   omitted. The skill traces constraints from validation schemas (Zod,
   express-validator, Pydantic) into parameter documentation.

6. **Consistent structure** - Baseline docs have inconsistent formatting across
   endpoints. The skill enforces a standard section order: description,
   parameters, request body, response, errors, example.

## Skill Improvements Across Iterations

### Iteration 1 -> 2 (83.3% -> 95.8%)

- Added explicit instruction to document 500 errors from catch blocks
- Added guidance for OpenAPI global security configuration
- Strengthened requirement for per-endpoint error response examples
- Added instruction to trace middleware-level errors to all affected endpoints

### Iteration 2 -> 3 (95.8% -> 100.0%)

- Added instruction to trace every custom error class to every endpoint that
  could trigger it
- Added "document 429 on all rate-limited endpoints" instruction
- Added guidance on documenting middleware-injected errors (auth, rate limiting)
  on individual endpoints

## Cost Analysis

The skill increases token usage by ~2.6x (23,367 vs 9,100) and time by ~2.6x
(43.1s vs 16.9s). This is expected because comprehensive API documentation
requires:

- Generating detailed parameter tables
- Creating realistic JSON examples
- Producing a full OpenAPI spec
- Documenting all error scenarios

The additional cost is justified by the 83.3% improvement in documentation
quality.

## Plateau Detection

Pass rate improved by 4.2% from iteration 2 to 3, reaching 100%. The skill has
reached maximum effectiveness on these eval cases. Further iterations would not
improve the with-skill pass rate (already at ceiling) and the without-skill
baseline is stable, confirming the assertions are genuinely discriminating.
