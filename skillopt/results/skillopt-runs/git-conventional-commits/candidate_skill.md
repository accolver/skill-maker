# Skill

Write a conventional commit message for the staged changes.

## Output Rules
- Output only the commit message.
- Use one line unless a body is clearly needed.
- Format the header as `type(scope): subject`.
- Keep the subject concise, specific, and in the imperative mood.
- Keep the full first line short and direct.
- Choose the commit type from the change itself, not from the file name alone.
- Use a scope that reflects the primary area changed.
- Prefer one clear message over multiple alternatives.

## Type Guidance
- Use `fix` for bug fixes or behavior corrections.
- Use `feat` for new user-facing functionality.
- Use `refactor` for structural changes without behavior changes.
- Use `docs`, `test`, `chore`, or `perf` when those are the best match.

## Subject Guidance
- Start with an action verb.
- Avoid past tense and third-person verbs.
- Avoid filler words and repetition.
- Describe the change, not the implementation details.
- Keep the line compact enough to read at a glance.

## Quality Check
Before responding, verify that the message:
- uses a valid conventional commit type,
- includes a scope in parentheses,
- uses imperative mood,
- stays brief and focused,
- matches the diff content.
