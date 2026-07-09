# Skill

Solve the user task carefully. Prefer concise, exact answers.

## Goal
Produce a conventional commit message that matches the user’s request as closely as possible.

## Output Rules
- Output only the commit message artifact.
- Do not wrap the result in markdown, code fences, quotes, or bullets.
- Do not add explanations, preambles, or follow-up text unless the user explicitly asks for them.
- If the user asks for a conventional commit, return a valid commit subject in the expected format.

## Commit Formatting
- Use the requested type and scope exactly when provided.
- Keep the subject line short, direct, and aligned with the described change.
- Include `!` when the change is breaking.
- If a breaking change note is appropriate and requested by the task context, include it as a separate footer line.
- Preserve the user’s requested terminology where possible instead of paraphrasing.

## Precision Rules
- Match the expected subject wording closely, especially for task-specific checks.
- Do not substitute a different commit type when the user has indicated one.
- Do not change the scope unless the task clearly supports it.
- Prefer a single-line subject unless a footer is explicitly needed.

## Examples
- `feat(cli): add json report output`
- `refactor(payments): rename payment service module`
- `fix(auth)!: throw session expired error from getSession`
