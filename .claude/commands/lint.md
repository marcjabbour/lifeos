---
description: Run linting on specified files or current changes
argument-hint: [file-or-pattern]
---

Run linting and formatting on $ARGUMENTS. If no argument provided, lint all staged/modified files.

Files to check:
!`if [ -z "$ARGUMENTS" ]; then git diff --name-only --diff-filter=d HEAD; else echo "$ARGUMENTS"; fi`
