#!/usr/bin/env bash
# parse-diff.sh — Analyze staged git changes and output structured JSON
# Usage: bash parse-diff.sh [--no-diff-content]
#
# Outputs a JSON object with:
#   files_changed   — array of {path, status, old_path?}
#   packages        — detected monorepo scopes
#   stats           — {files, insertions, deletions}
#   diff_summary    — truncated diff content (omitted with --no-diff-content)
#   has_breaking_changes — heuristic boolean

set -euo pipefail

INCLUDE_DIFF=true
MAX_DIFF_LINES=300

for arg in "$@"; do
  case "$arg" in
    --no-diff-content) INCLUDE_DIFF=false ;;
  esac
done

# ── Ensure we're in a git repo ──────────────────────────────────────
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo '{"error": "not a git repository"}' >&2
  exit 1
fi

# ── Check for staged changes ────────────────────────────────────────
STAGED_FILES=$(git diff --cached --name-status)
if [[ -z "$STAGED_FILES" ]]; then
  echo '{"error": "no staged changes", "files_changed": [], "packages": [], "stats": {"files": 0, "insertions": 0, "deletions": 0}, "diff_summary": "", "has_breaking_changes": false}'
  exit 0
fi

# ── Parse file statuses ─────────────────────────────────────────────
# Build JSON array of changed files
FILES_JSON="["
FIRST=true
while IFS=$'\t' read -r status path old_path; do
  # Map git status letters to human-readable
  case "${status:0:1}" in
    A) readable_status="added" ;;
    M) readable_status="modified" ;;
    D) readable_status="deleted" ;;
    R) readable_status="renamed" ;;
    C) readable_status="copied" ;;
    T) readable_status="type-changed" ;;
    *) readable_status="unknown" ;;
  esac

  # For renames/copies, git outputs: R100\told_path\tnew_path
  if [[ "${status:0:1}" == "R" || "${status:0:1}" == "C" ]]; then
    actual_path="$old_path"
    original_path="$path"
    # Swap: in R status, format is R<score>\t<old>\t<new>
    # But with name-status, it's: R100\told\tnew
    # $path = old, $old_path = new when read with IFS=\t and 3 fields
    # Actually: git diff --name-status shows "R100\told_name\tnew_name"
    # With IFS=\t read -r status path old_path:
    #   status=R100, path=old_name, old_path=new_name
    actual_path="$old_path"  # new path
    original_path="$path"     # old path
  else
    actual_path="$path"
    original_path=""
  fi

  if [[ "$FIRST" == true ]]; then
    FIRST=false
  else
    FILES_JSON+=","
  fi

  # Escape paths for JSON (handle quotes and backslashes)
  escaped_path=$(printf '%s' "$actual_path" | sed 's/\\/\\\\/g; s/"/\\"/g')
  escaped_original=$(printf '%s' "$original_path" | sed 's/\\/\\\\/g; s/"/\\"/g')

  if [[ -n "$original_path" ]]; then
    FILES_JSON+="{\"path\":\"${escaped_path}\",\"status\":\"${readable_status}\",\"old_path\":\"${escaped_original}\"}"
  else
    FILES_JSON+="{\"path\":\"${escaped_path}\",\"status\":\"${readable_status}\"}"
  fi
done <<< "$STAGED_FILES"
FILES_JSON+="]"

# ── Detect monorepo packages/scopes ─────────────────────────────────
# Look for common monorepo directory patterns
declare -A SEEN_PACKAGES
PACKAGES_JSON="["
PKG_FIRST=true

while IFS=$'\t' read -r _ filepath _; do
  # Check common monorepo prefixes
  for prefix in packages apps libs services modules src/packages src/apps src/libs; do
    if [[ "$filepath" == ${prefix}/* ]]; then
      # Extract the package name (first directory after prefix)
      remainder="${filepath#${prefix}/}"
      pkg_name="${remainder%%/*}"
      if [[ -n "$pkg_name" && -z "${SEEN_PACKAGES[$pkg_name]:-}" ]]; then
        SEEN_PACKAGES["$pkg_name"]=1
        if [[ "$PKG_FIRST" == true ]]; then
          PKG_FIRST=false
        else
          PACKAGES_JSON+=","
        fi
        escaped_pkg=$(printf '%s' "$pkg_name" | sed 's/\\/\\\\/g; s/"/\\"/g')
        PACKAGES_JSON+="\"${escaped_pkg}\""
      fi
      break
    fi
  done
done <<< "$STAGED_FILES"
PACKAGES_JSON+="]"

# ── Gather stats ────────────────────────────────────────────────────
STAT_OUTPUT=$(git diff --cached --shortstat 2>/dev/null || echo "")
FILES_COUNT=0
INSERTIONS=0
DELETIONS=0

if [[ -n "$STAT_OUTPUT" ]]; then
  # Parse "N files changed, N insertions(+), N deletions(-)"
  FILES_COUNT=$(echo "$STAT_OUTPUT" | grep -oE '[0-9]+ file' | grep -oE '[0-9]+' || echo 0)
  INSERTIONS=$(echo "$STAT_OUTPUT" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo 0)
  DELETIONS=$(echo "$STAT_OUTPUT" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo 0)
fi

# Default to 0 if empty
FILES_COUNT=${FILES_COUNT:-0}
INSERTIONS=${INSERTIONS:-0}
DELETIONS=${DELETIONS:-0}

# ── Diff content (truncated) ────────────────────────────────────────
DIFF_SUMMARY=""
if [[ "$INCLUDE_DIFF" == true ]]; then
  FULL_DIFF=$(git diff --cached 2>/dev/null || echo "")
  TOTAL_LINES=$(echo "$FULL_DIFF" | wc -l | tr -d ' ')

  if [[ "$TOTAL_LINES" -gt "$MAX_DIFF_LINES" ]]; then
    DIFF_SUMMARY=$(echo "$FULL_DIFF" | head -n "$MAX_DIFF_LINES")
    DIFF_SUMMARY+=$'\n'"... [truncated: ${TOTAL_LINES} total lines, showing first ${MAX_DIFF_LINES}]"
  else
    DIFF_SUMMARY="$FULL_DIFF"
  fi
fi

# ── Breaking change heuristic ───────────────────────────────────────
HAS_BREAKING=false
DIFF_FOR_ANALYSIS=$(git diff --cached 2>/dev/null || echo "")

# Check for common breaking change indicators
if echo "$DIFF_FOR_ANALYSIS" | grep -qiE '(BREAKING|breaking.change)'; then
  HAS_BREAKING=true
elif echo "$DIFF_FOR_ANALYSIS" | grep -qE '^\-.*\bexport\b.*(function|class|interface|type|const|enum)\b'; then
  # Removed exports suggest breaking changes
  HAS_BREAKING=true
elif echo "$DIFF_FOR_ANALYSIS" | grep -qE '^\-.*\b(public|protected)\b.*\('; then
  # Removed or changed public/protected method signatures
  HAS_BREAKING=true
fi

# ── Escape diff for JSON ────────────────────────────────────────────
# Use python/python3 if available for reliable JSON escaping, otherwise basic sed
escape_json_string() {
  local input="$1"
  if command -v python3 &>/dev/null; then
    python3 -c "import json,sys; print(json.dumps(sys.stdin.read()), end='')" <<< "$input"
    return
  elif command -v python &>/dev/null; then
    python -c "import json,sys; print(json.dumps(sys.stdin.read()))" <<< "$input"
    return
  fi
  # Fallback: basic escaping (may not handle all edge cases)
  printf '%s' "$input" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | awk '{printf "%s\\n", $0}' | sed '$ s/\\n$//'
}

if [[ "$INCLUDE_DIFF" == true ]]; then
  ESCAPED_DIFF=$(escape_json_string "$DIFF_SUMMARY")
else
  ESCAPED_DIFF='""'
fi

# ── Output JSON ─────────────────────────────────────────────────────
cat <<ENDJSON
{
  "files_changed": ${FILES_JSON},
  "packages": ${PACKAGES_JSON},
  "stats": {
    "files": ${FILES_COUNT},
    "insertions": ${INSERTIONS},
    "deletions": ${DELETIONS}
  },
  "diff_summary": ${ESCAPED_DIFF},
  "has_breaking_changes": ${HAS_BREAKING}
}
ENDJSON
