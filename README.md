# PERIS

Luxury abaya house for Dubai. The approved architecture is in [docs/architecture.md](docs/architecture.md).

This workspace is at Stage 2: the design system, the editorial homepage, and a working sample edit. The bag and wishlist are saved in the browser. Accounts, orders, and payments are not connected yet, and the site says so wherever a button would otherwise pretend they are.

## Run the storefront

From this folder:

```bash
corepack pnpm install
corepack pnpm dev
```

Open http://localhost:5173

## Font

Add the licensed file `SuisseIntl-Regular.woff2` to `apps/web/public/fonts/`. The layout already points at it. Until then, the site uses Helvetica Neue.

## Sample edit

Photographs in `apps/web/public/media` are temporary studies, not the PERIS archive. The wordmark in `apps/web/public/brand` is cropped from the supplied PÉRIS logo. Prices on the sample pieces are placeholders.
