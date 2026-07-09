# F-gate-1: audit/ROUND severity scan failed open on malformed findings

- Severity: low
- Status: Verified-Fixed
- Area: gate

## Summary

The `scripts/gate.sh` audit-finding scanner extracted the Severity/Status tokens
with `... | tr -cd 'a-z'`, which concatenates trailing annotations
(`- Severity: medium (mitigated)` → `mediummitigated`) so the finding no longer
matches the `critical|high|medium` case and **silently stops blocking the gate**.
A missing/typo'd Severity or Status line likewise produced an empty token that
was treated as non-blocking. Net effect: the security gate could fail _open_ on a
malformed finding file.

Reported by the scaffold red-team pass (redteam-auditor).

## Fix

`scripts/gate.sh` now extracts only the first word of each field via anchored
`sed`, and the scan **fails closed**: a medium+ finding blocks unless its Status
is explicitly `Verified-Fixed` or `Accepted-Risk`, and any unrecognized severity
or malformed line increments the blocking count. Verified by running the gate
against the current finding set (this file + F-ui-1 Verified-Fixed, F-net-1 /
F-headers-1 Accepted-Risk) — gate reports `gate OK`.
