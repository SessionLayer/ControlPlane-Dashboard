#!/usr/bin/env bash
# Re-vendor the OpenAPI contract from the canonical copy in the sibling
# ControlPlane-API repo. The parent SessionLayer/ folder is NOT a git repo and CI
# checks out this repo alone, so the spec is vendored (committed) at
# openapi/openapi.yaml. Run this after the upstream contract changes, then
# `npm run generate:api` to regenerate the typed client, and commit both.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="../ControlPlane-API/contracts/openapi/openapi.yaml"
DST="openapi/openapi.yaml"

if [ ! -f "$SRC" ]; then
  echo "note: canonical spec not found at $SRC (sibling repo absent)."
  echo "      Vendored copy at $DST is left unchanged. This is expected in CI,"
  echo "      which checks out ControlPlane-Dashboard alone."
  exit 0
fi

cp "$SRC" "$DST"
echo "Synced $DST from $SRC."
echo "Next: 'npm run generate:api' then commit openapi/ and src/api/schema.d.ts."
