#!/usr/bin/env bash
# ControlPlane-Dashboard ROUND_FINAL gate. Self-contained: used by CI
# (.github/workflows/ci.yml), `make dash-gate`, and the project hook. Playwright
# browsers must already be installed (CI runs `npx playwright install --with-deps
# chromium` first; locally run it once).
set -euo pipefail
cd "$(dirname "$0")/.."

npm run lint
npm run build
npm run test
npm run test:e2e
npm audit --audit-level=high

# Contract drift: the checked-in typed client MUST equal what the frozen spec
# regenerates. If this diffs, run `npm run generate:api` and commit the result.
npm run generate:api
git diff --exit-code -- src/api

# audit/ROUND gate: a finding at medium+ severity must be explicitly resolved
# (Verified-Fixed or Accepted-Risk). This scan FAILS CLOSED — a malformed or
# unrecognized Severity/Status line blocks the gate rather than being ignored.
# Extract only the first word of each field so trailing annotations (e.g.
# "medium (mitigated)") cannot mangle the token.
open=0
shopt -s nullglob
for f in audit/F-*.md; do
  sev=$(sed -nE 's/^- *Severity:[[:space:]]*([A-Za-z]+).*/\1/Ip' "$f" | head -1 | tr 'A-Z' 'a-z')
  st=$(sed -nE 's/^- *Status:[[:space:]]*([A-Za-z-]+).*/\1/Ip' "$f" | head -1 | tr 'A-Z' 'a-z')
  case "$sev" in
    critical | high | medium)
      case "$st" in
        verified-fixed | accepted-risk) : ;; # resolved — does not block
        *)
          echo "UNRESOLVED $sev (status='${st:-<missing>}'): $f"
          open=$((open + 1))
          ;;
      esac
      ;;
    low | info) : ;; # below the blocking threshold
    *)
      echo "UNRECOGNIZED severity '${sev:-<missing>}' in $f (blocking, fail-closed)"
      open=$((open + 1))
      ;;
  esac
done
[ "$open" -gt 0 ] && {
  echo "$open unresolved medium+ / malformed finding(s)"
  exit 1
}
echo "gate OK"
