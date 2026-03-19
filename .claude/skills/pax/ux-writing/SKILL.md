---
name: ux-writing
description: >
  UX writing rules for Paystack's PAX design system. Use this skill whenever
  generating, reviewing, or modifying user-facing text in a PAX-based UI —
  button labels, dialog titles, form copy, error messages, table content,
  status indicators, toast notifications, and any other text a user reads.
  Covers tone, casing, word limits, anti-patterns, and component-specific
  writing guidance.
---

# UX Writing

These rules govern all user-facing text in PAX interfaces. They exist because
consistent, clear copy reduces cognitive load and builds trust — users
shouldn't have to re-read surrounding context to understand what a control
does.

## Global Rules

These apply everywhere, regardless of component.

### Casing

Use **sentence case** for all UI text: capitalize the first word and proper
nouns only.

| Correct | Incorrect |
|---|---|
| Confirm payment | Confirm Payment |
| Save changes | SAVE CHANGES |
| Delete account | delete account |

### Tone

- Write in **present tense**: "Your trial has expired," not "Your trial will
  be expired."
- Use **plain language**. Avoid jargon, nested conditions, or overly technical
  phrasing.
- Be **neutral and descriptive**, not emotional or guilt-tripping. Respect the
  user's autonomy — especially around destructive actions.
- Be **specific**. "We couldn't load your data" is better than "Something went
  wrong."

### Brevity

Shorter copy gets read. Longer copy gets skipped.

- Aim for **1–3 words** on buttons and labels.
- Aim for **1–2 sentences** on descriptions and helper text.
- If text is getting long, reword rather than truncate.

---

## Action Labels

Rules for text on `Button`, `IconButton`, and any clickable action element.

### Buttons

- **Start with an action verb.** The label should describe what happens:
  "Download PDF", "Delete account", "Save changes".
- **Be specific.** "Confirm payment" is better than "OK". "Yes, delete
  account" is better than "Yes".
- **2–3 words max.** Truncate through rewording, not ellipsis.

Avoid these vague labels — they force the user to re-read context:

| Avoid | Use instead |
|---|---|
| OK | Confirm payment |
| Submit | Save changes |
| Confirm | Confirm transfer |
| Yes | Yes, delete account |
| Done | Close |
| Click here | Download PDF |

### Links

- Make the destination obvious from the link text alone.
- Avoid "Click here", "Learn more", or "Read this" as standalone link text.

| Correct | Incorrect |
|---|---|
| Sign in to your account | Click here |
| Read the pricing details | Learn more |
| View payout settings | Read this |

---

## Dialogs and Sheets

`ModalDialog` and `Sheet` share the same writing rules for title, description,
and footer buttons. `ConfirmationDialog` has additional rules for destructive
framing.

### Title

- Be specific and succinct — **one line ideal, two lines max**.
- Use a **verb** if the user must act: "Confirm payment", "Send invite",
  "Delete this file".
- Avoid vague labels like "Notice", "Alert", or "Confirmation".
- If the dialog was opened by clicking a button, **reuse the button label** as
  the dialog title. Example: user clicks "Create mandate" → dialog title is
  "Create mandate".

### Description

- State **what's happening, why it matters, and the consequence** — especially
  for destructive actions.
- Keep it to **1–2 sentences**.
- Don't repeat the title. Add context, not redundancy.
- Break complex information into bullets or short paragraphs.
- If the title and purpose are already clear, skip the description entirely.

### Footer buttons

- Use **active words** that describe the dialog's purpose: "Add", "Delete",
  "Save".
- Avoid vague or passive words: "Done", "OK".
- Primary button on the **right** (LTR layouts). Secondary button on the left.
- The secondary button should never be more visually prominent than the
  primary.

### Confirmation dialogs specifically

- **Frame destructive actions as questions:** "Delete project?" frames it as a
  decision the user is making.
- **Never use "Are you sure?"** — say what they're confirming instead.
- **Describe consequences clearly:** "This action will permanently delete all
  tasks and files."
- **Don't guilt-trip.** "You'll lose everything!" is manipulative. State facts
  neutrally.

---

## Feedback Components

### Alert

- Use **present tense**: "Your trial has expired," not "Your trial will be
  expired."
- **Focus on next steps.** Avoid vague statements like "There was a problem" —
  tell the user what to do about it.

### Toast

- **Start with a past-tense verb:** "Saved", "Uploaded", "Copied."
- This is post-action confirmation — be immediate and brief. You have
  1–2 seconds of the user's attention.

---

## Status Text

### Chip (status variant)

- **1–2 words max.** This is a glanceable indicator.
- Use **present tense** reflecting the current state: "Active", not
  "Activated".
- Use clear, recognizable terms. Avoid internal jargon.
- Start with a capital letter: "Pending", not "pending".
- Prefer adjectives or state verbs: "Active", "Failed", "Pending".

### Chip (input variant)

- Use sentence case.
- Show the full value unless there's a strict character limit.
- Trim whitespace and normalize capitalization if auto-generated.

### Chip (badge usage)

- Use **numbers, short status words, or dots only**.
- Never write full sentences.
- If using text labels (e.g., "New"), capitalize.
- Dots should be explained via context or tooltip.

### Chip (label usage)

- Use proper nouns or categories (capitalize as needed).
- **1–2 words.** Avoid sentence structure or verbs.

---

## Tables

- Use **clear, concise column headers.** Avoid jargon or internal terms.
- **Right-align numbers** for easy comparison (unless the number is the first
  column).
- Use **short, scannable cell text**: "Paid", "Pending". Pair with color or
  icon for quick recognition.
- For long cell content, truncate with ellipsis after the first line. Provide
  a title-tooltip on hover for the full text.
- If a cell has no data, show **"—"** or **"N/A"** — never leave it blank.
- Be specific in action text: "View details" is better than "Details".
- Only show the most important data in the default view. Use progressive
  disclosure (modals, drawers) for detailed data.

### Empty states in tables

Always consider **why** the table is empty before choosing copy:

| Scenario | Copy approach |
|---|---|
| First-time use (no data exists) | Encouraging message: "No refunds yet." Help text: "When you create your first refund, it'll show up here." |
| No results from filter/search | Explain: "There are no transactions that match this query." Suggest: "Try another query or clear your filters." |

### Error states in tables

| Scenario | Copy approach |
|---|---|
| First-time load failed | "We couldn't load your data." "Please check your connection and try again." [Retry] |
| Filtered results failed | "We couldn't apply your results." "Please check your connection and try again." [Retry] |

---

## Form-Adjacent Components

### Toggle (`Switch` in code)

- The label **before** the switch describes the feature being controlled.
- Labels **after** the switch (right or bottom in LTR) optionally indicate
  state.

### Toggle group (`ToggleGroup` in code)

- **1–2 words max** per label: "List", "Grid", "Chart".
- Write in sentence case.
- Label text should reflect the **state or result** of the toggle: "Dark
  mode", "Light mode".
- For icon-only items, always provide `aria-label`: `aria-label="List view"`.
- Avoid ambiguous terms like "Option 1 / Option 2".

| Correct | Incorrect |
|---|---|
| List | View items in list format |
| Grid | Option 2 |
| Dark mode | MODE |

---

## Navigation and Progress

### Segmented control (`SegmentedControl` in code)

- Use **short, concise labels.** Avoid multiline text.

### Progress indicators

- Labels should be **1–2 words max**.
- Use **nouns or noun phrases**, not actions: "Password" not "Enter password".
- Avoid jargon. Use everyday terms.
- Labels should mirror headings in the related step's page.

| Correct | Incorrect |
|---|---|
| Verification | Identity Checking |
| Agreements | Policy Terms Acceptance Flow |
| Password | Enter Password |

---

## Loading and Empty States

### Empty state

- **Be clear and concise.** "No refunds yet."
- **Be helpful.** "When you create your first refund, it'll show up here."
- Use verbs for primary actions: "Create refund".
- Provide supportive paths: "Learn more".

### Spinner and loading state

- When paired with text, keep the message brief: "Loading orders…"

### Skeleton

- **Show static text that never changes** (like page titles on list pages)
  and skeleton-load text that varies (like titles on detail pages).

---

## Password Validation

PAX uses a **length-based strength model** that favors passphrases over
complexity. This is a deliberate product decision — don't fall back to
traditional complexity rules (uppercase + lowercase + number + special
character).

| Strength | Threshold | Message |
|---|---|---|
| Error | < 8 characters | "Use at least 12 characters. Try a sentence or a mix of random words you'll remember. Avoid names, dates, or common phrases for your account security." |
| Moderate | 8–12 characters | "Moderate password. Strengthen your password by adding more words or phrases." |
| Strong | 13+ characters | "Strong password!" |

The tone is important:
- **Error** messages educate without shaming.
- **Moderate** messages nudge toward passphrases without invoking fear.
- **Strong** messages are short, affirming, and reward-based.

---

## File Upload Messages

Use specific, actionable messages for each constraint and error state:

| Scenario | Message |
|---|---|
| Allowed file types | "PDF or PNG only." |
| File size limit | "Up to 2 MB per file." |
| File count limit | "Up to 5 files." |
| Uploading progress | "Uploading… 0.1 KB of 15.01 KB" |
| Upload success | Checkmark confirmation |
| Pending save | "Uploaded, pending save" |
| File size error | "Exceeds file size. 2 MB file size limit" |
| Connection error | "Connection failed. Please try again." [Retry] |
| Max files reached | Disable the upload zone |

Block disallowed types, oversize files, and excess file count **before**
upload starts. For network failures, timeouts, and server errors during
upload, always provide an actionable **Retry** option.

---

## Tooltips

- Keep the tone **neutral and descriptive**.
- Prefer constraint-stating: "Maximum 50 characters" over "You can't type
  more than 50 characters".
- Tooltips supplement — they should never be the only way to access critical
  information.