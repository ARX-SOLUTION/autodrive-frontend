# AutoDrive tenant frontend

React 19 + Vite tenant workspace for Automaktab driving schools. The public
marketing site is a separate application; this app only serves authenticated
owner, manager, operator and teacher workflows.

## Development

```bash
pnpm install
pnpm run dev
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
pnpm run check:bundle
```

The app uses TanStack Router for file-based routes and TanStack Query for
server state. `src/services/` contains feature query/mutation factories;
`src/shared/api/schema.d.ts` is generated from the authenticated backend
OpenAPI contract and must not be edited manually.

## API contract

Set `OPENAPI_TOKEN` or `OPENAPI_USERNAME` plus `OPENAPI_PASSWORD` only in the
runtime environment, then run:

```bash
pnpm run api:types
pnpm run api:check
```

Never use a `VITE_` prefix for contract credentials: Vite exposes those values
to browser code. The tenant API base URL remains `VITE_API_BASE_URL`.

## Storybook

Storybook hosts visual stories for the shadcn primitives this app uses, plus a
`Foundations/Tokens` reference page that reads directly from
`@autodrive/design-tokens` (so what you see is what ships).

```bash
pnpm run storybook        # dev server on http://localhost:6006
pnpm run build-storybook  # outputs to ./storybook-static (gitignored)
```

Stories included:

- `UI/Button` — all variants + sizes
- `UI/Card` — basic and with header/footer
- `UI/Input` — default, disabled, with label
- `UI/Dialog` — open-by-default + trigger
- `UI/Toaster` — success, error, info via `sonner`
- `Foundations/Tokens` — color swatches, radii, font sizes

Use the toolbar theme switcher to flip between light and dark modes.
