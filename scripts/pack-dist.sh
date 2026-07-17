#!/usr/bin/env bash
# Deterministic tarball of the Vite dist/ for reproducible release packaging (S22):
# sorted entries, a fixed mtime (SOURCE_DATE_EPOCH), zeroed owner/group, and gzip
# without its header timestamp — so two builds of the same commit tar to an
# identical sha256.
set -euo pipefail
out="${1:?usage: pack-dist.sh <output.tgz>}"
epoch="${SOURCE_DATE_EPOCH:-0}"
tar --sort=name \
  --mtime="@${epoch}" \
  --owner=0 --group=0 --numeric-owner \
  --format=gnu \
  -cf - -C dist . | gzip -n >"$out"
