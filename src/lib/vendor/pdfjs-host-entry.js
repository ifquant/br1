const hostPdfjsEntry = "/vendor/pdfjs/pdf.min.mjs";

// @ts-ignore - this file is served by the host contract created via pnpm setup-vendors
await import(/* @vite-ignore */ hostPdfjsEntry);

export {};
