# Pax Usage

## Version

`@paystack/pax@2.0.0` — built on Tailwind v4 + Radix UI primitives.

## Setup (Critical)

Pax uses `@tailwindcss/vite` (Tailwind v4) — not Tailwind v3.

**vite.config.js:**
```js
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tailwindcss(), react()]
})
```

**src/index.css:**
```css
@import "tailwindcss";
@import "../node_modules/@paystack/pax/dist/theme.css";
```

The direct `node_modules` path is required because the package's `exports` field
is missing the `"style"` condition that Tailwind v4's `@import` resolver needs.
Using `@import "@paystack/pax/dist/theme.css"` fails at build time.

## Components Used

### Skeleton
Used in every data-fetching view for loading states. Pax's Skeleton renders a
shimmering placeholder that communicates "data is coming" without a spinner.

```jsx
import { Skeleton } from '@paystack/pax'
<Skeleton className="h-4 w-32" />
```

### Select (dropdown)
Used in the Transactions filter bar. Pax's Select is built on Radix UI, so it
handles keyboard navigation, focus management, and accessibility for free.

```jsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@paystack/pax'

<Select value={status} onValueChange={setStatus}>
  <SelectTrigger className="w-40 text-sm">
    <SelectValue placeholder="All statuses" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">All statuses</SelectItem>
    <SelectItem value="completed">Completed</SelectItem>
  </SelectContent>
</Select>
```

### Button
Used across onboarding and action surfaces. Variants: `default` (filled),
`outline`, `text` (inline link-style). Colors: `primary`, `secondary`. Sizes
`sm`/`xs`. `asChild` renders the Pax styling onto a child element — used to make a
real `<a>` look like a text button (e.g. Signup "Sign in", CheckEmail "View it
here", Verify "Open in a new tab").

```jsx
import { Button } from '@paystack/pax'
<Button asChild variant="text" color="primary" size="xs"><a href="/...">Link</a></Button>
```

### TextInput
Form inputs on the Signup screen. Pair with own validation (`noValidate` form) +
`aria-invalid`/`aria-describedby` for error states.

## Design Tokens (Tailwind Classes)

All colors come from `@paystack/pax/dist/theme.css` and are available as
Tailwind utility classes:

| Token group | Example classes |
|-------------|----------------|
| Navy | `text-navy-700`, `bg-navy-100`, `border-navy-200` |
| Cerulean (brand blue) | `text-cerulean-600`, `bg-cerulean-50` |
| Stack Green | `text-stack-green-500`, `bg-stack-green-200` |
| Gray | `text-gray-500`, `bg-gray-50`, `border-gray-200` |
| Red | `text-red-500`, `bg-red-50` |
| Amber | `text-amber-700`, `bg-amber-50`, `border-amber-200` |
| Purple | `text-purple-600`, `bg-purple-100` |

## Custom Components (Pax-styled)

These don't exist in Pax but are styled exclusively with Pax tokens:

- `OnboardingShell` — cardless centered frame for all pre-dashboard screens (logo
  pinned top, content centered). Props: icon/title/subtitle/backdrop/maxWidth/align
- `DetailPanel` — slide-in panel with width animation
- `Timeline` — vertical stepper with cerulean dots
- `Badge` — semantic color mapping for statuses/types
- `Sparkline` — Recharts wrapper (Recharts is a separate dep, not Pax)
- `CopyButton` — clipboard utility

## What Pax Doesn't Have (Yet)

- Chart/sparkline components → use Recharts
- Timeline/stepper → custom-built
- Detail panel pattern → custom-built

## Out of scope: the landing page

`src/landing/` (marketing site at `/`) deliberately does NOT use Pax. It's ported
from a standalone repo that styles with plain `<a>`/inline styles + standard Tailwind
utilities + framer-motion. It shares the same Tailwind v4 build (so standard utilities
and arbitrary values just work), but pulls in no Pax components or tokens. Keep it that
way — don't introduce Pax into landing components, and don't leak landing patterns
(inline-style CTAs, framer-motion) into the dashboard.
