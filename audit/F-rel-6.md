# F-rel-6: dist tarball not reproducible off-runner — file mode bits + major-only node pin

- Severity: low
- Status: Verified-Fixed
- Area: rel

## Issue

`scripts/pack-dist.sh` normalized entry order, mtime, and owner/group, but not
the **mode bits**, which follow the builder's umask (Vite writes 0644 under one
umask, 0664 under another) — so the tarball digest differed across environments.
Separately, `.nvmrc` pinned node to the major `22` only, so the release build's
node patch floated.

## Impact

Same as F-supplychain-2 in the CP: the in-workflow same-runner double-build gate
cannot see it, but an independent verifier on a different machine (NFR-7's
third-party-verifiability goal) gets a mismatching sha256 despite identical
source and dist content.

## Fix

- `pack-dist.sh`: add `--mode='u+rwX,go=rX'` to the `tar` invocation → 0644 files
  / 0755 dirs regardless of the builder's umask.
- `.nvmrc`: pin the exact patch `22.23.1` (the version built against) so
  `setup-node` (release + gate both read `.nvmrc`) installs a fixed node.

## Resolution (Session 22)

Verified locally: two packs of the same dist now produce an identical sha256 with
`-rw-r--r-- 0/0` files and `drwxr-xr-x 0/0` dirs. Node pinned to 22.23.1.
