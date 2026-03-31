---
name: code-reviewer
description: Review existing code or diffs for bugs, security issues, performance problems, maintainability risks, and test gaps when the user wants evaluation, not new implementation.
---

# Code Reviewer

## Overview

Perform thorough, structured code reviews that catch real issues and provide
actionable feedback. Every finding is categorized by type, assigned a severity
level, and paired with a concrete fix suggestion. The goal is a review that a
developer can act on immediately — not vague observations.

## When to use

- The task is evaluating existing code, a diff, or a pull request for defects and risks.
- The user wants findings, severity, rationale, and fix suggestions rather than new implementation.
- The review scope includes bugs, security, performance, maintainability, or test coverage.
- The output should help a developer decide what to change before merging or shipping.

**Do NOT use when:**

- The user wants code written from scratch.
- The task is primarily architecture planning or a refactor proposal with no review target.
- The user only wants formatting or lint cleanup that an automated tool should handle.


## Response format

Always structure the final response with these top-level sections, in this order:

1. **Summary** — state the task, scope, and main conclusion in 1-3 sentences.
2. **Decision / Approach** — state the key classification, assumptions, or chosen path.
3. **Artifacts** — provide the primary deliverable(s) for this skill. Use clear subheadings for multiple files, commands, JSON payloads, queries, or documents.
4. **Validation** — state checks performed, important risks, caveats, or unresolved questions.
5. **Next steps** — list concrete follow-up actions, or write `None` if nothing remains.

Rules:
- Do not omit a section; write `None` when a section does not apply.
- If files are produced, list each file path under **Artifacts** before its contents.
- If commands, JSON, SQL, YAML, or code are produced, put each artifact in fenced code blocks with the correct language tag when possible.
- Keep section names exactly as written above so output stays predictable across skills.

## Workflow

### 1. Understand Context

Before reviewing line-by-line, understand the big picture:

- **What does this code do?** Read the PR description, commit messages, or ask.
- **What language/framework?** Adjust expectations to the ecosystem's
  conventions.
- **What's the scope?** A 10-line utility function gets different scrutiny than
  a 500-line auth module.
- **Are there tests?** Note their presence or absence early.

Output: A 1-2 sentence summary of what the code is doing and its context.

### 2. Scan for Bugs and Logic Errors

Read through the code looking for correctness issues:

- Off-by-one errors in loops and array access
- Null/undefined dereferences
- Incorrect boolean logic or operator precedence
- Missing return statements or unreachable code
- Race conditions in concurrent code
- Incorrect error propagation

For each bug found, note the exact line, what's wrong, and what the fix is.

### 3. Check Security

Systematically check for common vulnerability classes:

- **Injection**: SQL, command, XSS, template injection — any place user input
  reaches a sink
- **Authentication/Authorization**: Missing auth checks, privilege escalation
  paths
- **Data exposure**: Secrets in code, verbose error messages, logging sensitive
  data
- **Insecure defaults**: Disabled TLS verification, permissive CORS, weak crypto
- **Input validation**: Missing or insufficient validation of external input

Security findings are almost always **critical** or **high** severity.

### 4. Evaluate Performance

Look for patterns that will cause performance problems at scale:

- **N+1 queries**: Database calls inside loops
- **Unbounded operations**: Missing pagination, loading entire tables
- **Unnecessary work**: Redundant computations, repeated parsing
- **Missing caching**: Expensive operations that could be cached
- **Algorithmic complexity**: O(n^2) or worse where O(n) or O(n log n) is
  possible
- **Resource leaks**: Unclosed connections, file handles, streams

### 5. Assess Style and Readability

Check that the code is clear and follows conventions:

- Consistent naming (camelCase, snake_case — match the project)
- Functions and variables have descriptive names
- No deeply nested conditionals (> 3 levels)
- Comments explain "why", not "what"
- Dead code or commented-out code removed
- Consistent error handling patterns

Style findings are typically **low** or **info** severity.

### 6. Check Maintainability

Evaluate long-term code health:

- **Function length**: Functions over 50 lines likely need extraction
- **Cyclomatic complexity**: Too many branches = hard to test and reason about
- **Magic numbers/strings**: Unnamed constants scattered through code
- **Coupling**: Does this code depend on too many other modules?
- **Testability**: Can this code be unit tested without mocking the world?
- **Duplication**: Copy-pasted logic that should be extracted

### 7. Produce Structured Report

Compile all findings into the output format below. Order findings by severity
(critical first, info last). Include a summary section with overall assessment.


## Code Review Summary

**Context**: [1-2 sentence summary of what the code does] **Overall
Assessment**: [PASS | PASS WITH CONCERNS | NEEDS CHANGES | REJECT] **Findings**:
[N critical, N high, N medium, N low, N info]

## Findings

### [SEVERITY] [CATEGORY]: [Brief title]

**Location**: [file:line or description of where] **Issue**: [What's wrong and
why it matters] **Suggestion**: [Specific code or approach to fix it]

```diff
- problematic code
+ suggested fix
```

---

[Repeat for each finding, ordered by severity]

## Recommendations

[2-3 sentences on the most important things to address before merging]
````

Also produce a structured `findings.json`:

```json
{
  "summary": {
    "context": "Brief description",
    "overall_assessment": "NEEDS CHANGES",
    "total_findings": 5,
    "by_severity": {
      "critical": 1,
      "high": 1,
      "medium": 2,
      "low": 1,
      "info": 0
    },
    "by_category": {
      "security": 1,
      "bug": 1,
      "performance": 1,
      "style": 1,
      "maintainability": 1
    }
  },
  "findings": [
    {
      "severity": "critical",
      "category": "security",
      "title": "SQL injection via unsanitized user input",
      "location": "app/db.py:42",
      "issue": "User input is concatenated directly into SQL query string",
      "suggestion": "Use parameterized queries instead of string concatenation",
      "fix_diff": "- cursor.execute(f\"SELECT * FROM users WHERE id = {user_id}\")\n+ cursor.execute(\"SELECT * FROM users WHERE id = %s\", (user_id,))"
    }
  ]
}
```

## Example

**Input code to review:**

```python
def get_user_orders(db, user_id):
    query = "SELECT * FROM orders WHERE user_id = " + user_id
    results = db.execute(query)
    orders = []
    for row in results:
        product = db.execute(f"SELECT name FROM products WHERE id = {row['product_id']}")
        orders.append({"order": row, "product": product[0]["name"]})
    return orders
```

**Review output:**

## Code Review Summary

**Context**: Function retrieves a user's orders with product names from a
database. **Overall Assessment**: NEEDS CHANGES **Findings**: 1 critical, 1
high, 1 medium, 0 low, 0 info

## Findings

### CRITICAL SECURITY: SQL injection via string concatenation

**Location**: Line 2 **Issue**: `user_id` is concatenated directly into the SQL
query. An attacker can inject arbitrary SQL (e.g.,
`1 OR 1=1; DROP TABLE orders`). This is the #1 web application vulnerability
(OWASP A03:2021). **Suggestion**: Use parameterized queries.

```diff
- query = "SELECT * FROM orders WHERE user_id = " + user_id
+ query = "SELECT * FROM orders WHERE user_id = %s"
+ results = db.execute(query, (user_id,))
```

### HIGH PERFORMANCE: N+1 query pattern

**Location**: Lines 4-6 **Issue**: For each order row, a separate database query
fetches the product name. With 100 orders, this executes 101 queries instead
of 2. This will degrade linearly with data volume. **Suggestion**: Use a JOIN or
batch query.

```diff
- for row in results:
-     product = db.execute(f"SELECT name FROM products WHERE id = {row['product_id']}")
-     orders.append({"order": row, "product": product[0]["name"]})
+ query = """
+     SELECT o.*, p.name as product_name
+     FROM orders o JOIN products p ON o.product_id = p.id
+     WHERE o.user_id = %s
+ """
+ results = db.execute(query, (user_id,))
+ orders = [{"order": row, "product": row["product_name"]} for row in results]
```

### MEDIUM BUG: No error handling for empty results

**Location**: Line 7 **Issue**: If `product` query returns empty results,
`product[0]["name"]` will raise an IndexError. This is likely when products are
deleted but orders remain. **Suggestion**: Add a guard for empty results.

```diff
- orders.append({"order": row, "product": product[0]["name"]})
+ product_name = product[0]["name"] if product else "Unknown Product"
+ orders.append({"order": row, "product": product_name})
```

## Recommendations

Fix the SQL injection immediately — it's a critical security vulnerability. Then
refactor the N+1 query pattern with a JOIN, which will also eliminate the empty
result bug. Add parameterized queries throughout.

---

## Common Mistakes

| Mistake                                      | Fix                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| Vague findings like "this could be improved" | Always state WHAT is wrong, WHY it matters, and HOW to fix it                     |
| Missing severity levels                      | Every finding needs critical/high/medium/low/info                                 |
| Reviewing only for style, ignoring security  | Follow the full workflow: bugs → security → performance → style → maintainability |
| Suggesting fixes without showing code        | Include diff-style code suggestions for non-trivial fixes                         |
| Treating all issues as equal priority        | Order by severity; developers should fix critical/high first                      |
| Reviewing code you don't understand          | Ask for context first; state assumptions explicitly                               |
| Nitpicking style in code with critical bugs  | Focus on what matters most; don't bury critical findings in style noise           |

## Key Principles

1. **Be specific, not vague** — "Line 42 has an SQL injection because user_id is
   concatenated into the query" beats "watch out for security issues." Every
   finding must point to a specific location and explain the concrete problem.

2. **Always suggest a complete fix** — Identifying a problem without a solution
   is only half the job. Include code diffs or clear instructions for every
   finding above info severity. A fix must be concrete enough that a developer
   can implement it without guessing — show the actual code change, not just
   "add error handling." If the fix requires imports, setup, or configuration
   changes, include those too.

3. **Explain the why** — Developers learn and prioritize better when they
   understand consequences. "This N+1 pattern will execute 1001 queries for 1000
   rows" is more compelling than "this is an N+1 query."

4. **Prioritize ruthlessly** — A review with 3 critical findings and 2 high
   findings is more useful than one with 47 low-severity style nits. Lead with
   what matters.

5. **Categorize consistently** — Use the severity and category system for every
   finding. This lets developers filter, triage, and track review feedback
   systematically.
