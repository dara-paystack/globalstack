---
# Pax Limitations Registry
This file is the authoritative record of known accessibility gaps in Pax components.

**Maintained by:** Pax Working Group
**Read by:** `pax-accessibility` skill (automatically, at the start of every audit)
**Written to by:** `pax-accessibility` skill (automatically, when a new gap is discovered during an audit)
---

## How this file works

### Adding a limitation

When the `pax-accessibility` skill finds a gap that lives inside a Pax component's own implementation, it appends a row to the table below. Every limitation will be addressed by the Pax Working Group in time.

The skill will not add a duplicate — it checks for the component name and gap description before writing.

If you are adding an entry manually (e.g. from an external audit or user report), use the same column format as the table below.

### Resolving a limitation

When a Pax fix ships:

1. Remove the row from this table
2. Note the fix in the Pax changelog / component release notes
3. The skill will automatically treat the component as clean on the next audit

### Column guide

| Column         | What goes here                                                                         |
| -------------- | -------------------------------------------------------------------------------------- |
| Component      | Exact Pax component name                                                               |
| Gap            | One sentence: what's missing or incorrect in the component's own accessibility output  |
| Severity       | P0 (blocks task) / P1 (significant difficulty) / P2 (degrades experience) / P3 (minor) |
| WCAG criterion | Criterion number + short name, e.g. `1.4.3 Contrast (minimum)`                         |
| Workaround     | A fix the consumer can apply outside the component, or "None"                          |
| Logged         | Date first identified                                                                  |
| Status         | Open / In progress / Fixed (remove row when fixed)                                     |

---

## Known limitations

| Component | Gap                        | Severity | WCAG criterion | Workaround | Logged | Status |
| --------- | -------------------------- | -------- | -------------- | ---------- | ------ | ------ |
| —         | No limitations logged yet. | —        | —              | —          | —      | —      |

---

## Audit history

A record of audits that have been run using this skill, for traceability.

| Date | What was audited | Auditor | New limitations found | Notes |
| ---- | ---------------- | ------- | --------------------- | ----- |
| —    | —                | —       | —                     | —     |

---

## Notes for the Pax team

- Every row in the limitations table should have a corresponding open ticket in the Pax backlog
- When a fix ships, delete the row here and reference this file in your component release notes so consumers know the gap has been closed
- If a limitation has a workaround, consider whether it should be documented in the component's own usage notes in the Pax docs until the fix lands