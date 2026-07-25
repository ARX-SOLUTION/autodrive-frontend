# Welcome to your Lovable project

TODO: Document your project here.

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
