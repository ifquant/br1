# 0371 Preserve PDF.js Top Level Await Build

This slice fixes the production Vite build after the broader verification pass exposed a PDF.js host shim issue.

## Why this matters

`foliate-js/pdf.js` imports `@pdfjs/pdf.min.mjs` for side effects and immediately reads `globalThis.pdfjsLib`. In br1 that import is aliased to `src/lib/vendor/pdfjs-host-entry.js`, which checks the host-served PDF.js assets and then imports `/vendor/pdfjs/pdf.min.mjs`.

That shim intentionally uses top-level `await` so the side-effect import does not finish until PDF.js has populated `globalThis.pdfjsLib`.

The default Vite production target tried to transpile the bundle for older browser targets such as `chrome87` and `safari14`, where esbuild refuses top-level `await`. The app is a Tauri/WebView product and can preserve modern ESM output for this PDF bootstrap path.

## What changed

`vite.config.js` now sets:

```js
build: {
  target: "esnext",
}
```

The config comment documents why this is tied to the PDF.js side-effect import ordering rather than a generic build preference.

## Verification

Run:

```bash
pnpm check
pnpm build
```

Expected result: Svelte diagnostics pass, and Vite production build completes without the top-level-await transform failure.

## Takeaway

When a vendored ESM shim intentionally uses top-level `await` to preserve side-effect ordering, do not rewrite it into an async fire-and-forget import. Either the importer must await an explicit API, or the build target must preserve top-level `await`.
