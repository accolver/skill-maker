# Security Analyst

> **Status: Planned** — This skill is queued for construction with skill-maker.

A skill for security code analysis: OWASP top 10 scanning, dependency
vulnerability checking, secret detection, security header analysis, and auth
flow review. Brings structured security review practices into the development
workflow.

## When built, this skill will...

- Scan codebases for OWASP Top 10 vulnerabilities (injection, XSS, CSRF, etc.)
- Check dependencies for known CVEs and suggest patched versions
- Detect hardcoded secrets, API keys, and credentials in source code
- Analyze HTTP security headers and recommend improvements
- Review authentication and authorization flows for common weaknesses
- Generate actionable security reports with severity ratings and fix guidance

## Tools & Dependencies

- `semgrep` / `bandit` — static analysis and pattern matching
- `trivy` / `npm audit` — dependency vulnerability scanning
- `gitleaks` / `trufflehog` — secret detection

## Getting Started

To build this skill, run skill-maker:

```
Create a skill for security code analysis: OWASP top 10 scanning, dependency vulnerability checking, secret detection, security header analysis, and auth flow review
```
