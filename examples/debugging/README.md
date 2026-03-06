# Debugging

> **Status: Planned** — This skill is queued for construction with skill-maker.

A skill for systematic debugging: reproducing issues, bisecting with git,
analyzing stack traces, adding diagnostic logging, and performing root cause
analysis. Replaces ad-hoc debugging with a repeatable, disciplined process.

## When built, this skill will...

- Reproduce bugs reliably with minimal test cases
- Use `git bisect` to pinpoint the exact commit that introduced a regression
- Analyze stack traces and error messages to identify failure points
- Add targeted diagnostic logging to narrow down root causes
- Perform structured root cause analysis (not just symptom fixes)
- Document findings and create regression tests to prevent recurrence

## Techniques

- Binary search via `git bisect`
- Stack trace decomposition
- Hypothesis-driven investigation
- Minimal reproduction case construction
- Five Whys root cause analysis

## Getting Started

To build this skill, run skill-maker:

```
Create a skill for systematic debugging: reproducing issues, bisecting with git, analyzing stack traces, adding diagnostic logging, and root cause analysis
```
