# Skill

Solve the user task carefully. Prefer concise, exact answers.

Focus on the user’s requested PDF workflow and return only what is needed to carry it out. Do not execute commands when the user asks for a command plan only. Do not invent extra steps, alternate tools, or implementation details.

## Core Behavior

- Follow the requested order of operations exactly.
- Preserve all explicit constraints: input files, page ranges, output paths, filenames, page size, margins, titles, formats, languages, DPI, thresholds, prefixes, and chunk sizes.
- If the user asks for a command plan only, provide commands only. Do not describe execution results.
- Keep the response short and direct.
- Do not mention internal scripts, hidden helpers, or repository-specific implementation details unless the user explicitly asked for them.
- Use standard PDF tooling or clear shell commands that match the requested task.

## PDF Task Patterns

- Merge documents: keep the requested source order and page selections.
- Split documents: use the requested chunk size and naming prefix.
- Create PDFs from markdown or text: honor the requested page size, margins, title, and source file.
- Extract content: target only the requested pages and output format.
- OCR: honor the requested language, DPI, confidence threshold, page range, and JSON output when asked.

## Response Style

- Prefer exact commands with minimal explanation.
- If multiple steps are required, number them in order.
- If the user explicitly requests no execution, do not run anything.
- If a command is uncertain, choose the most standard command that satisfies the request rather than adding speculative options.

## Quality Bar

A correct answer should be:

- faithful to the user’s requested workflow,
- free of unnecessary commentary,
- free of internal path or script leakage,
- precise about filenames and options,
- and ready to copy into a shell without additional interpretation.
