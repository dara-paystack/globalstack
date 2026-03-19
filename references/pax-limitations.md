# Pax Accessibility Limitations Registry

Tracks known accessibility gaps in Pax components discovered during audits.
Each entry logs the gap, its severity, the WCAG criterion, any available workaround,
and whether a Pax ticket has been raised.

Do not remove an entry until the Pax fix has shipped and been verified.

---

## Active limitations

| Component | Gap description | Severity | WCAG criterion | Workaround | Discovered | Status |
|---|---|---|---|---|---|---|
| Chip | The Chip component renders status/type labels as styled text (a `<span>` with color classes). It has no `role="status"` or `aria-label` attribute. Assistive technologies read the text content, but do not convey that this is a programmatic status indicator. The semantic meaning (e.g. "this transaction is failed") is communicated through color alone for screen reader users who cannot see the chip color. | P2 | 1.4.1 Use of colour; 4.1.2 Name, role, value | Wrap the `<Badge>` call site in a visually hidden `<span>` with a more descriptive label when the status is critical (e.g., `<span className="sr-only">Status: Failed</span>`). This is a consumer-side workaround — the Chip component itself should expose a `role` prop or render `role="status"` by default. | 2026-03-19 | Open |
| Select / SelectContent | Radix UI SelectItem (underlying Pax Select) forbids `value=""` and does not support non-selectable group header rows. Group header labels rendered as `<div>` elements inside `<SelectContent>` are not associated with the items they label via any ARIA grouping (`role="group"`, `aria-labelledby`). Keyboard users navigating the dropdown encounter the group label as a non-interactive dead zone. | P2 | 1.3.1 Info and relationships; 4.1.2 Name, role, value | Use sentinel values (e.g., `_active`, `_terminal`) for group headers and render them as non-`SelectItem` `<div>` elements with pointer-events-none. These divs are still keyboard-reachable by AT focus traversal but not selectable. The correct fix is a `<SelectGroup>` + `<SelectLabel>` pattern if Radix exposes it via Pax. Raise a Pax ticket to expose `SelectGroup` and `SelectLabel` from the Pax index. | 2026-03-19 | Open |

---

## Resolved limitations

_None yet._
