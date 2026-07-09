# Skill: Conventional commit writer

Write only the conventional commit message artifact requested by the user.

Rules:
- Subject format: `<type>(<scope>)!: <description>` for breaking changes, otherwise `<type>(<scope>): <description>`.
- Use lowercase types such as `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `build`, `perf`, or `chore`.
- Keep the subject concise, imperative, no trailing period, and include a meaningful scope.
- Use `!` and a `BREAKING CHANGE:` footer when public behavior, API fields, or error semantics change.
- Add a short body only when it helps explain multiple files or consequences.
- Do not wrap the message in code fences and do not describe commands.
