---
name: usage-guidelines
description: >
  Component usage guidelines for Paystack's PAX design system. Use this skill
  when deciding which component to use for a given UI need, how to compose
  compound components, or how a component should behave in context. Covers
  when-to-use/when-not-to-use guidance, cross-component decision flows,
  sizing semantics, composition patterns, state lifecycles, and behavioral
  rules. Does not cover copy/wording (see ux-writing skill) or ARIA/keyboard
  requirements (see accessibility skill).
---

# Usage Guidelines

These guidelines help you choose the right PAX component for each situation
and use it correctly. The most common agent mistake isn't using the wrong
prop — it's picking the wrong component entirely.

---

## Feedback Components

PAX has four feedback mechanisms. Choosing the wrong one is the most frequent
component-selection error.

| Need | Use | Not |
|---|---|---|
| Persistent, non-blocking system/page status | `Alert` | Toast, Modal |
| Ephemeral confirmation of a user action | `toast()` | Alert, Modal |
| User must confirm or cancel a serious action | `ConfirmationDialog` | Alert, Toast |
| User must complete a task or respond to urgent info | `ModalDialog` | Alert, Toast |

### Alert

Alerts surface persistent, non-blocking information about the system or page
state. They sit at the top of a screen or section and stay visible until
dismissed or resolved.

**Use when:**
- The issue is ongoing and requires user action or awareness
- You need to surface system feedback tied to the current screen (e.g., failed
  compliance, verification required)
- The information is critical or time-sensitive (security prompts, account
  issues)

**Don't use for:**
- Ephemeral feedback → use `toast()`
- Blocking decisions → use `ConfirmationDialog`
- Field-specific validation → use inline error messaging via `Field`

**Behavioral rules:**
- Don't stack 3+ alerts. Combine or prioritize.
- Always include a title for scannability.
- Reserve `severity="danger"` for critical blocking issues.
- Don't use alerts for success messages — use `toast()`.
- Every alert should either be dismissible or resolvable.

### Toast

Toasts are lightweight, transient messages that confirm recent user actions.
They appear temporarily and auto-dismiss.

**Use when:**
- Confirming a user-triggered action: "Message sent", "Saved"
- A background task finishes: "Export complete"
- You want brief feedback without taking focus

**Don't use for:**
- Errors that need user action → use `Alert`
- Messages not tied to a user action
- Critical messages that can't be missed

**Behavioral rules:**
- Auto-dismiss after ~5 seconds. Don't require manual close.
- Position in top-center or top-right.
- Don't show toasts without prior user interaction.
- Don't repeat the same toast multiple times in a row.

### Confirmation Dialog

Confirmation dialogs interrupt the user's flow to confirm an action with
serious consequences. Use them deliberately.

**Use when** the action causes loss/breakage/danger, requires an immediate
decision, and was triggered by the user. If none of those apply, use `Alert`
or `toast()` instead.

**Don't use for:**
- Passive notifications → use `Alert` or `toast()`
- Routine confirmations ("Saved successfully") → use `toast()`
- Reminders or nags — they should feel essential, not annoying

### Modal Dialog

Modal dialogs capture the user's attention for important information or
focused tasks. They disable interaction with the rest of the interface until
dismissed.

**Use when:**
- You require an immediate response from the user
- The user must make a decision before continuing
- The information is critical or time-sensitive

**Don't use when:**
- The message is non-urgent → use inline content, `Alert`, or `toast()`
- The task can be completed without disrupting the current workflow
- The user needs access to the rest of the page to decide (e.g., referencing
  other data)

**Sizing rules:**

| Size | Code value | Use for |
|---|---|---|
| Small | `"sm"` | Brief text, simple confirmations |
| Medium | `"md"` | Forms, moderate content |
| Large | `"lg"` | Complex content, tables |
| X-Large | `"xl"` | Data-heavy views |

- If content causes too much scrolling at the current size, use the next
  size up.
- If x-large still isn't enough space, the content probably belongs on a
  full page instead.
- On mobile, the max-height doesn't apply — the modal either fills the
  screen or sticks to the bottom.

---

## Overlay Components

### Sheet

Sheets slide in from any screen edge to present focused content without
navigating away. They support both modal and non-modal behavior.

**Use when:**
- Presenting focused tasks: editing, filtering, confirming
- Providing mobile-friendly alternatives to modals
- Showing complex secondary content without full navigation

**Don't use for:**
- Brief alerts or confirmations → use `toast()`
- Global system messages → use `Alert`

### Overlay

There is no standalone `Overlay` component. Each dialog family
(`ModalDialog`, `Sheet`, `ConfirmationDialog`) has its own internal overlay.
Don't try to import or compose an Overlay directly.

---

## Selection and Input Components

### Chips, Badges, and Labels

These are all implemented through the `Chip` component with different
variants. There is no standalone `Badge` component.

| Concept | Code | Purpose | Interactive? |
|---|---|---|---|
| Status chip | `Chip variant="status"` | Current state of a system/object | No — always passive |
| Input chip | `Chip variant="input"` | User-generated values or selections | Yes — dismissible, draggable |
| Badge | `Chip variant="badge"` | Attention indicator (count, notification) | No — always passive |
| Label | `Chip variant="label"` | Categorizes or classifies an object | No — always passive |

**Status chips:**
- Use to represent a state like "Approved" in tables or lists
- Don't make them dismissible or selectable

**Input chips:**
- Use for removable tags in a form or field
- Don't use for static data or interactive content

**Badges:**
- Use to notify users of new content or counts
- Don't use for system states, filters, or calls to action

**Labels:**
- Use to visually distinguish types of objects in tables or lists

### Toggle (`Switch` in code)

A toggle represents an on/off state. It's for settings that take effect
**immediately** without confirmation.

- Use for binary settings applied right away.
- **Don't use for options that require form submission** — use `Checkbox` or
  `RadioGroup` instead.

### Toggle Group (`ToggleGroup` in code)

Lets users choose one option from a short related set (e.g., view modes)
without leaving the current page.

**Use when:**
- Choosing between a few related options that change view state (List / Grid /
  Compact)
- Switching is immediate and reversible
- Options don't change page context

**Don't use when:**
- Selection navigates to a new page → use `Tabs`
- Options are form inputs needing submission → use `RadioGroup`
- User can choose multiple options → use Checkbox group

### Checkbox vs. Radio

| Need | Use |
|---|---|
| Multiple non-exclusive selections | `Checkbox` |
| Single exclusive selection from a set | `RadioGroup` |

- Don't use `RadioGroup` if the user must be able to clear all options —
  radios always require one active selection.

---

## Navigation Components

### Tabs vs. Segmented Control

These are the most commonly confused pair. Use this comparison:

| Criteria | `Tabs` | `SegmentedControl` |
|---|---|---|
| Platform | Web + Mobile | Mostly mobile (iOS native) |
| Use case | Navigate between content sections | Switch between subsets/filters of same data |
| Granularity | High-level page or screen | Intra-page, local element-level |
| Position | Top of page/screen | Inline with content, above lists/cards |
| Content scope | Full content area changes | Partial content change only |
| Persistence | Each tab retains its own state | No persistence — changes update instantly |

**Tabs behavioral rules:**
- Limit to 8 tabs. Prefer 5 or fewer — beyond that, consider grouping
  or progressive disclosure.
- Order by relevance — first tab is the most logical starting view.
- Group tabs with similar content adjacent to each other.
- Never nest tabs inside tabs.
- Don't mix tabs with back/forward browser navigation — use routing.
- Don't use tabs to filter content unless each tab has substantially
  different content structure.

**Segmented control behavioral rules:**
- Limit to 8 segments.
- Too subtle for full-context page changes or longform content — use Tabs.
- Use only when options are mutually exclusive and not optional.
- Maintain equal width across all segments.
- Avoid icon-only segments unless the icon is universally recognizable.

**Note:** `SegmentedControl` exists in PAX source but is **not exported**
from the published package. Check import availability before using it.

### Breadcrumbs (`Breadcrumb` in code)

Breadcrumbs show the user's current location in the site hierarchy.

- Display hierarchical location, not session history.
- Current page is the last item and should not be a link.
- Don't use for flat hierarchies (1–2 levels deep) or linear flows.
- Must not wrap to multiple lines.
- Supplements — never replaces — primary navigation.

---

## Dropdown Menu

`DropdownMenu` is a composable Radix wrapper with no built-in menu
types. You build different menu patterns by choosing which primitives
to compose:

- **Action menus** (e.g., row-level "more" menus): `DropdownMenuItem`
  for flat lists, `DropdownMenuSub` + `DropdownMenuSubTrigger` for
  hierarchical grouping. Group larger sets with `DropdownMenuLabel`
  and `DropdownMenuSeparator`.
- **Filter menus** (e.g., table filter dropdowns): Present filter
  categories first, then show contextual input for the chosen
  category. Include Apply/Clear actions when explicit confirmation
  is needed.
- **Selection menus** (e.g., column visibility toggles): Use
  `DropdownMenuCheckboxItem` for multi-select or
  `DropdownMenuRadioItem` + `DropdownMenuRadioGroup` for
  single-select.

Make triggers descriptive (e.g., "More actions", "Filter") and avoid
generic icons where possible. Don't overload menus; if the list grows
long, group with labels, dividers and separators.

---

## Loading Components

PAX has three loading primitives. Choosing the right one depends on what
you're loading and how much structure you can preview.

| Need | Use |
|---|---|
| Just a spinner visual (no text) | `Spinner` |
| Spinner + contextual text ("Loading orders…") | Loading state pattern (`Spinner` + text) |
| Show content structure before data arrives | `Skeleton` |

### Spinner

A visual primitive indicating a request has been received. Cannot communicate duration.

- Use for in-component loading (inside buttons, cards, small regions).
- **Don't use for full page loads** — use `Skeleton`.
- When showing a spinner inside a button, disable the button to
  prevent duplicate submissions.
- `"sm"` size only on actionable components like buttons.

**Positioning:** Centered in region for section-level loading; inline for
small UI elements; overlay for critical operations requiring blocked
interaction.

### Skeleton

Shows content structure while loading, reducing perceived wait time and
layout shift.

- Use for pages where all content loads at the same time.
- Mimic the target layout — the skeleton should look like the loaded page.
- Show static text that never changes (e.g., "Products" page title on a list
  page) but skeleton-load text that varies (e.g., product name on a detail
  page).

### Loading State (pattern, not a component)

There is no standalone `LoadingState` component. The "Loading state" from the
spec is a pattern: `Spinner` paired with descriptive text. Compose it yourself.

### Choosing the Right Loader

- Don't show loaders for actions that complete instantly — it adds
  friction with no informational value.
- Prefer spinners over skeletons when the content structure is
  unpredictable.
- If a wait exceeds ~10 seconds, escalate beyond an indefinite spinner
  to a progress bar or loading state with descriptive text.

---

## Progress Components

### Progress Indicator (not in code)

There is no `ProgressIndicator` component in PAX. Build a custom stepper or
use a third-party library for multi-step flows (onboarding, checkout, KYC).

### Mega Progress Indicator (not in code)

There is no `MegaProgressIndicator` component in PAX. This pattern is for
large structured flows with nested sub-steps (e.g., Onboarding v3).

Use a standard step indicator for short linear flows (4–5 steps or fewer).
Use a mega indicator pattern for flows exceeding that, with nested/repeatable
subflows or non-linear navigation.

**If building custom:**
- Keep main steps to 1–2 words. Limit hierarchy depth to 3 levels.
- Always preserve progress visually — don't reset state on navigation.
- Align step order with logical task completion, not system architecture.
- In responsive layouts, collapse into a side drawer.

---

## Empty States (not a component)

There is no standalone `EmptyState` component in PAX. Empty states are a
composition pattern using headings, illustrations, and buttons.

**Use when:**
- A feature or page has no content yet (first-time use)
- Filters or searches return no matches
- Users have removed all items
- Error or access limitations prevent showing content

**Don't use when:**
- Content is loading → use `Skeleton` or `Spinner`
- It's a critical error → use `Alert`

**Composition rules:**
- Show only the most relevant actions — don't overwhelm.
- Can be composed inside a Card.
- Keep animations subtle and accessible. No flashing or looping.

---

## Data Components

### Table

PAX provides cell-level building blocks for tables, not a rigid template.
Compose cells by passing content as children to `TableCell`. For
bulk row selection, use `TableSelectCell` and `TableSelectHeader`.

For detailed table composition, filter flow, column management, and state
lifecycle guidance, read `references/tables.md`.

---

## File Upload

Two upload triggers exist:

| Trigger | Use when | Drag & drop? |
|---|---|---|
| `size="large"` (drop zone) | Uploading is the primary purpose of the screen | Yes (desktop/tablet) |
| `size="small"` (button) | Uploading within a form | No |

**Behavioral rules:**
- Uploaded items display above the upload trigger.
- Block disallowed types, oversize files, and excess count **before** upload.
- When max file count is reached, disable the upload zone.
- With label: add a label when using within a form or grouping multiple
  upload components.
- Image previews: available in drop zone variant. Full-page preview via
  view icon.
- Reordering: drag to reorder uploaded items.

**Upload lifecycle:**

| Stage | Behavior |
|---|---|
| Uploading | Spinner with progress text + Cancel option |
| Cancelled | Remove file from list |
| Success | Checkmark confirmation |
| Pending save | Cloud icon + "Uploaded, pending save" |
| File size error | Error icon + constraint message |
| Connection error | Error message + Retry option |

---

## Buttons and Links

### Button Sizing

| Size | Use |
|---|---|
| `"sm"` (default) | All touchpoints. Always start here. |
| `"md"` | Optical alignment with input fields, or full-width buttons. Never use `"sm"` at full width. |
| `"lg"` | Mobile touchpoints only. |

Combine variant and color to create visual hierarchy — don't rely on size
alone.

### Links

There is no `Hyperlink` or `Link` component in PAX. Use a styled `<a>` tag
or `Button` with `asChild` wrapping an anchor.

**Use a link when** the primary intent is navigation:
- Go to another page or screen
- Open help docs, policies, or external resources
- Jump to a section on the same page

**Use a `Button` when** the intent is an in-app action:
- Toggling UI
- Submitting forms
- Triggering commands

Downloads can go either way. Only open new tabs when there's a strong
reason — if you must, use an external link icon.

---

## Tooltips

Tooltips provide supplementary information on hover, focus, or tap. They
should never contain critical or actionable content.

**Behavioral rules:**
- Remain visible while the user's pointer or focus is on the trigger or
  tooltip.
- Dismiss on pointer leave or Escape key.
- Set `delayDuration` on `TooltipProvider` to 300–500ms to prevent
  flicker (default is 0).
- Allow 100–300ms hide grace period for pointer movement between
  trigger and tooltip.
- Keep visible for at least 5 seconds.
- Must not obscure essential UI (especially form fields or error messages).
- Avoid hover-only triggers — ensure keyboard and touch access.

---

## Components Not in Code

These spec sheets describe concepts with no matching PAX component. Don't
try to import them.

| Spec concept | What to do instead |
|---|---|
| Cards | Build with standard HTML/Tailwind |
| Hyperlink | Use `<a>` tag or `Button` with `asChild` |
| Password Input | Use `TextInput type="password"` + `InputGroup` for toggle |

Empty State, Loading State, Loading Patterns, Overlay, Progress Indicator,
and Mega Progress Indicator are also not importable — see their respective
sections above for composition guidance.