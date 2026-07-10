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

# audit/ROUND gate — NO-DEFER (Session 3 §7): block on ANY finding whose Status
# is Open, of ANY severity (critical|high|medium|low|info), AND fail on any
# finding whose Status is Deferred — the no-defer rule bans kicking work down the
# road. Verified-Fixed and Accepted-Risk are the only allowed statuses. This scan
# FAILS CLOSED — a malformed or unrecognized Status line blocks the gate rather
# than being ignored.
open=0
deferred=0
bad=0
shopt -s nullglob
for f in audit/F-*.md; do
  st=$(sed -nE 's/^- *Status:[[:space:]]*(.*)/\1/Ip' "$f" | head -1 | tr 'A-Z' 'a-z' | tr -cd 'a-z-')
  case "$st" in
    verified-fixed | accepted-risk) : ;;
    open)
      echo "OPEN finding: $f"
      open=$((open + 1))
      ;;
    deferred)
      echo "DEFERRED finding (banned by the no-defer gate): $f"
      deferred=$((deferred + 1))
      ;;
    *)
      echo "UNPARSEABLE/unknown status ('$st'): $f"
      bad=$((bad + 1))
      ;;
  esac
done
total=$((open + deferred + bad))
[ "$total" -gt 0 ] && {
  echo "findings gate FAILED: $open open, $deferred deferred, $bad unparseable"
  exit 1
}
echo "gate OK"
