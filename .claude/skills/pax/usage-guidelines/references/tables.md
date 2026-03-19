# Table Usage Guidelines

PAX provides cell-level building blocks for tables, not a rigid template.
Compose cells by passing content as children to `TableCell`. For bulk row
selection, use `TableSelectCell` and `TableSelectHeader`.

## Table Toolbar Patterns

These are composition patterns you build yourself — they are not standalone
components:

| Pattern | Purpose | Behavior |
|---|---|---|
| Filter bar | Apply data filters | Sticky to top. Includes "Clear all". Shows active filters as chips. |
| Selection bar | Bulk actions on selected rows | Replaces filter bar when rows are selected. Shows count + actions. |
| Search bar | Keyword search + dataset actions | Sticky to top. Show feedback for empty results. |

## Filter Flow

1. User clicks "+ Add filter" → dropdown of available filter categories
2. Selecting a category opens a contextual input inline in the filter bar
3. User configures the value and clicks an inline Apply button
4. Applied filters display as chips — individually removable or
   bulk-cleared via "Clear all"
5. Multiple filters stack as separate chips; results update immediately

**Saved filters:**
- One saved filter supported (acts as default, auto-applied on load).
- Users create a default by saving any filter configuration.
- Updating overwrites the previous saved filter (label becomes "Update
  saved filter").

## Column Management

- "Edit columns" toggles column visibility. Only enable on data-dense
  tables.
- Visibility toggles apply immediately — no confirmation step.
- When columns are hidden, update the label: "Columns (9 of 12 visible)".
- Pin columns to keep important data fixed during horizontal scroll.
  Pinned columns stay left-aligned with a visual divider.
- Column reordering via drag handles. Pinned columns can't be dragged
  across the pinned/unpinned boundary.
- Changes persist for the session.
- Minimize horizontal scrolling. If unavoidable, ensure it works across
  mouse, trackpad, keyboard, and touch.

## State Lifecycle

| State | What to show |
|---|---|
| Loading (initial) | Keep headers/filter/search visible. Skeleton rows. Hide "Load more". |
| Loading (user-initiated) | Disable "Load more" button, show spinner. Disable filter/search/export. Reinstate "Load more" once new data loads. |
| Empty (no data yet) | Hide filter/search. Show empty state with illustration. |
| Empty (filters applied) | Keep filter/search visible. Disable search/export. Keep top-level actions enabled. |
| Error (first load) | Disable filter/search. Replace content with error + Retry. |
| Error (filtered) | Keep filters enabled. Disable search. Show error + Retry. |

## Table Actions

- Desktop: stack buttons side-by-side. Group related items.
- Mobile: hide behind a menu icon that opens a contextual `Sheet`.
- Prioritize the most common action as the main button.
- Actions should return explicit feedback (e.g., toast: "Export sent to
  your email").

## Pagination

| Type | Use when |
|---|---|
| Offset (page-based) | Users need to jump to specific pages. Data rarely changes. |
| Cursor (bookmark-based) | Smoother continuous experience. Data changes frequently. |