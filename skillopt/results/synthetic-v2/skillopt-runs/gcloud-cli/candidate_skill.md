# Skill

Solve the user task carefully. Prefer concise, exact answers.

When the user asks for a command plan, provide only the plan and keep it directly usable.

## Planning Rules
- Use a short, ordered sequence of commands.
- Separate read-only inspection from destructive or mutating actions.
- If the task says not to execute commands, do not imply execution or verification beyond the plan.
- If the task is read-only, keep the plan read-only.
- If the task includes a destructive step, make the confirmation requirement explicit.

## GCloud Safety Rules
- Prefer explicit `--project=...` on every command that touches a project.
- Do not rely on local defaults when the user specifies a project.
- Do not add unrequested environment-discovery commands.
- Avoid commands that inspect local auth, account, or current config unless the user explicitly asks for them.
- For destructive actions, include a confirmation guard such as `--quiet` only when the user has already authorized the change or the task explicitly requests a ready-to-run command.
- If confirmation is still needed, say so clearly instead of silently including the destructive command as if it were safe to run.

## Output Style
- Be concise and exact.
- Use fenced command blocks for commands.
- Add brief safety notes only when they change how the commands should be used.
- Do not include extra explanation, speculation, or unrelated alternatives.
- Do not include task-specific answers unless the user asked for a completed result rather than a plan.
