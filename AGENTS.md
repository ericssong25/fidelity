# AGENTS.md — Fidelity App (Zuma)

## What this is

Customer loyalty app ("Zuma") — React SPA with Supabase backend. Two roles: **customer** (accumulate points, redeem rewards) and **business** (manage loyalty program, view KPIs). UI is Spanish-language.

## Commands

```bash
npm run dev          # Dev server (localhost:5173)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit -p tsconfig.app.json
npm run build        # Production build
npm run preview      # Preview production build
```

No test runner is configured. Run `lint` and `typecheck` before considering work done.

## Architecture

- **Entry**: `src/main.tsx` → `App.tsx` → `BrowserRouter` wrapping `AuthProvider > AppProvider`
- **Routing**: Role-based layouts in `App.tsx`. `role` from `AppContext` switches between `CustomerLayout` and `BusinessLayout`. Customer routes: `/home`, `/cards`, `/cards/:businessId`, `/profile`. Business routes: `/business/*` (overview, customers, products, promotions, rewards, news, settings).
- **State**: React Context only — `AuthContext` (session/user), `AppContext` (role/toasts), `BusinessDataContext` (business data + loyalty cards). No Redux/Zustand.
- **Data layer**: Supabase client in `src/lib/supabase.ts`. Custom hook `useSupabaseQuery` in `src/hooks/useSupabaseQuery.ts` wraps queries with timeout, retry (exponential backoff), and in-memory cache. Prefer this hook over raw `supabase.from()` calls.
- **DB schema**: 15+ tables defined in root SQL files (`database-documentation.sql`, `create-rewards-tables.sql`, `add-hours-column.sql`). Run these in Supabase SQL Editor in that order.

## Environment

Requires `.env` with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Copy from `.env.example`. These are Vite-prefixed (`VITE_`), not Node env vars.

## Tailwind theme

Custom colors defined in `tailwind.config.js`: `primary` (#7546ED), `secondary` (#DC89FF), `navy`, `lavender`, `deep-blue`, `bg` (#F4F3FB), `success`, `error`. Custom border-radius tokens: `card` (16px), `btn` (12px), `inp` (8px). Font: Plus Jakarta Sans.

## Code conventions

- `@refresh reset` directive on context provider files (`AuthContext.tsx`, `BusinessDataContext.tsx`) — don't remove it; prevents HMR state corruption.
- `vite.config.ts` excludes `lucide-react` from `optimizeDeps` — keep this or icons may break in dev.
- `tsconfig.app.json` has `noUnusedLocals: true` and `noUnusedParameters: true` — compiler will error on dead code.
- ESLint flat config (`eslint.config.js`) enforces `react-hooks` rules and `react-refresh/only-export-components`.
- Mock data in `src/data/mockData.ts` is not used in production. App connects to live Supabase.

## Data flow gotchas

- `BusinessDataContext` loads loyalty cards with a separate query (not a Supabase join) and manually maps profiles. The same pattern appears in `useBusinessData` hook. If you add fields to cards or profiles, update both places.
- Auth relies on Supabase's native session lifecycle (`autoRefreshToken`, `onAuthStateChange`). When the session expires (e.g. tab backgrounded too long), `onAuthStateChange` fires with `SIGNED_OUT` and the app redirects to `/auth`. There is NO localStorage backup or zombie session recovery — this is intentional.
- The `RoleSwitcher` component exists for debug role switching — it's not gated behind a feature flag. It runs a `businesses` query on every `user` change; if that query fails with auth errors it has recovery logic.
- **`.single()` vs `.maybeSingle()`**: Supabase's `.single()` returns HTTP 406 when 0 rows match. Use `.maybeSingle()` for "0 or 1 row" queries.
- **Query timeout**: `BusinessDataContext` wraps queries with an 8-second timeout (`queryWithTimeout`) to prevent hung requests when the Supabase client has a stale JWT.
