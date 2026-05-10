// This declaration/shim exists to stabilize an external dependency boundary for
// the rest of the app. Keep only the minimum surface needed by br1 code.

const hostPdfjsEntry = "/vendor/pdfjs/pdf.min.mjs";

const requiredPdfjsAssets = [
  "/vendor/pdfjs/pdf.min.mjs",
  "/vendor/pdfjs/pdf.worker.min.mjs",
  "/vendor/pdfjs/jbig2.wasm",
  "/vendor/pdfjs/openjpeg.wasm",
];

/** @param {string} contentType */
const isJavaScriptMime = (contentType) =>
  /(?:javascript|ecmascript|text\/plain)/i.test(contentType);

/** @param {string} assetPath */
const checkPdfjsAsset = async (assetPath) => {
  const response = await fetch(assetPath, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Missing PDF vendor asset: ${assetPath}`);
  }

  if (assetPath.endsWith(".mjs")) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !isJavaScriptMime(contentType)) {
      throw new Error(
        `Invalid MIME type for PDF vendor entry ${assetPath}: ${contentType}`,
      );
    }
  }
};

const ensurePdfjsHostContract = async () => {
  try {
    await Promise.all(requiredPdfjsAssets.map(checkPdfjsAsset));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `PDF vendor assets are unavailable. Run "pnpm setup-vendors" to regenerate /static/vendor/pdfjs before opening PDF files. ${detail}`,
    );
  }
};

await ensurePdfjsHostContract();

// @ts-ignore - this file is served by the host contract created via pnpm setup-vendors
await import(/* @vite-ignore */ hostPdfjsEntry);

export {};
