# Security Policy

Bridge Reader is an early-stage desktop reader. This document describes the security boundaries that exist in the current source tree; it is not a claim that the application has completed a security audit.

## Reporting a Vulnerability

Prefer a private report through [GitHub Security Advisories](https://github.com/ifquant/br1/security/advisories/new). Include the affected commit or version, platform, reproduction steps, impact, and any suggested mitigation.

If private reporting is unavailable, open a minimal GitHub issue asking the maintainers to establish a private contact channel. Do not include exploit details, private book content, credentials, or tokens in a public issue.

The project is pre-release and does not promise a fixed response SLA. Maintainers will triage confirmed reports, limit disclosure to people working on the fix, and coordinate public disclosure after a remediation is available.

## Supported Versions

Security fixes are made against the latest `main` revision. Older development snapshots and locally modified builds are not maintained as separate security-support branches.

## Trust Model

### Protected Assets

- Imported book files, covers, and library metadata.
- Reading progress, bookmarks, notes, highlights, search caches, and reader-assistance history.
- Sync snapshots and KOReader exchange data selected by the user.
- Translation, remote-sync, and KOReader credentials supplied through the desktop environment.
- The integrity of the packaged Tauri application and its local application-data directory.

### Trusted Components

- The packaged Bridge Reader frontend and Rust/Tauri backend.
- The operating system, WebView runtime, and OS account that owns the application-data directory.
- Native file-picker and OS file-association delivery channels as user/OS authority signals. Their path arguments and file contents remain untrusted and must still pass native validation.
- Environment variables intentionally configured by the local device operator.

### Untrusted Inputs

- EPUB, PDF, FB2, MOBI, AZW3, CBZ, TXT, cover, and embedded book resources.
- Book metadata, links, markup, SVG, fonts, archives, and PDF structures.
- File-association arguments and renderer-supplied Tauri command payloads.
- Imported Bridge Reader snapshots, KOReader exchange files, and persisted JSON that may be malformed or manually changed.
- OPDS/Calibre catalog metadata, acquisition records, remote-sync payloads, and responses from lookup or translation providers.
- Dependency packages and generated vendor assets before they are reviewed and built into a release.

Possession of the local OS account is outside the application trust boundary. Bridge Reader does not try to defend its plaintext local data from an attacker who can already read or modify that account's application-data directory.

## Security Boundaries and Controls

### Book Import and Filesystem Access

- Native commands canonicalize selected paths, require regular files, and enforce the supported-format allowlist.
- Local-file imports are accepted only from a native picker, an OS-associated open request, or a source path already recorded by the managed library.
- Library reads and restore destinations are restricted to canonical managed paths or explicit in-memory grants. User-controlled storage keys are hashed before becoming path components.
- The production Tauri capability grants core window operations, native open-dialog access, external HTTP/HTTPS URL opening, and file reveal through the opener plugin. It does not grant the generic Tauri filesystem plugin.
- WebDriver-only commands and localhost capabilities compile only with the `webdriver` feature and are not part of the normal build.

Relevant implementation: `src-tauri/src/commands/library.rs`, `src-tauri/src/util.rs`, `src-tauri/capabilities/default.json`, and `src-tauri/src/lib.rs`.

### Book Rendering

- Bridge Reader treats book-controlled HTML, XHTML, and SVG as untrusted. A shared DOMPurify transform removes executable containers such as `script`, `iframe`, `object`, and `embed`, rejects `srcdoc`, and runs before Foliate creates reader iframe content.
- TXT content is assembled as text rather than interpreted as authored HTML.
- Footnote previews retain only a small structural tag allowlist and remove all attributes before the result enters application chrome.
- PDF content is processed by the lockfile-resolved `pdfjs-dist` runtime and locally generated vendor assets.

Relevant implementation: `src/lib/reader/foliate.ts`, `src/lib/reader/codeHighlighting.ts`, `src/lib/components/reader/ReaderViewport.svelte`, and `scripts/setup-pdfjs-vendor.mjs`.

### Renderer-to-Native Commands

- Tauri exposes named commands rather than a generic renderer-directed read, write, upload, or download command.
- Filesystem commands reconstruct or validate paths in Rust instead of trusting renderer-provided paths.
- Lookup and translation commands normalize provider names, languages, text lengths, timeouts, and response sizes in the Rust backend.
- OPDS live network proxying is not currently enabled. Configured catalog sources persist metadata but not credentials, and executable acquisitions are limited to bundled fixtures and validated acquisition records.

Relevant implementation: `src-tauri/src/lib.rs`, `src-tauri/src/commands/reader_services.rs`, and `src-tauri/src/commands/catalogs.rs`.

### Persistence and Restore

- Library state, notes, bookmarks, highlights, and caches are stored under Tauri's application-data root. Book-derived keys are hashed before use as filenames.
- Reader settings, assistance history and selections, translation/TTS state, and focused-reading state also use WebView `localStorage`. Loaders normalize or discard malformed payloads, but this storage remains plaintext and renderer-readable.
- Translation-provider metadata uses `BR1_READER_TRANSLATION_PROVIDERS_PATH` when the operator sets it, otherwise a legacy home-directory path, with a temporary-directory fallback when no home is available. The file stores provider status/labels rather than credentials; its location and integrity inherit the same local-operator and filesystem trust assumptions.
- Snapshot and KOReader exchange files are selected through native dialogs. Restore parsing rejects malformed schemas, duplicate record identifiers, unknown-book state, and destinations outside managed roots.
- Multi-file restore paths retain previous bytes and roll back completed mutations when a later write fails.
- Translation provider settings persist provider metadata only. DeepL and Yandex credentials are read from environment variables and are not accepted from renderer state.

Relevant implementation: `src-tauri/src/commands/sync_snapshot.rs`, `src-tauri/src/commands/reader_services.rs`, `src-tauri/src/util.rs`, and `src/lib/reader/currentBookPersistence.ts`.

### Network and Privacy Boundary

Network egress has two classes: explicit reader/sync requests and authored book resources that the WebView may load while rendering.

| Capability | Destination and data boundary |
| --- | --- |
| Dictionary lookup | `dictionaryapi.dev`; the selected term and normalized language leave the device. |
| Wikipedia lookup | An allowlisted Wikipedia language project; the selected term leaves the device. |
| DeepL translation | A fixed DeepL API endpoint; selected text, language metadata, and the environment-provided key leave the device. |
| Yandex translation | A fixed Yandex Cloud endpoint; selected text, language metadata, folder ID, and environment-provided credential leave the device. |
| Readest-compatible remote sync | An operator-configured base URL; library state and a bearer token leave the device. |
| KOReader server sync | An operator-configured base URL; document progress and KOReader credentials leave the device. |
| Authored book resources | Sanitized markup may retain HTTP/HTTPS links, styles, images, or other resource URIs. Loading behavior depends on Foliate and the platform WebView and may cause network requests or tracking without a separate lookup/sync action. |

Bridge Reader does not currently provide an in-app account system or server-side authorization layer. Third-party services and operator-configured sync servers have their own privacy and security policies.

### Supply Chain and Releases

- JavaScript and Rust dependency resolutions are recorded in `pnpm-lock.yaml` and `src-tauri/Cargo.lock`.
- PDF vendor assets are regenerated through the checked-in setup script instead of being maintained as unexplained manual copies.
- Lockfiles make dependency changes reviewable; they do not prove that a dependency is vulnerability-free.

## Known Security Gaps

These are current limitations, not implemented mitigations:

- `src-tauri/tauri.conf.json` currently sets the application CSP to `null`. Book markup sanitization is therefore a critical boundary rather than one layer in a complete CSP defense.
- Foliate's WebKit iframe path uses `allow-same-origin allow-scripts` for runtime event handling. Sanitization removes book-supplied executable markup, but the iframe sandbox is not treated as an independent security guarantee.
- Sanitized book markup may retain HTTP/HTTPS URIs, and the current CSP does not provide a second network-loading restriction. Remote-resource blocking and anti-tracking behavior for authored book content are not yet a complete guarantee.
- Local books, annotations, histories, caches, and provider metadata are not encrypted by Bridge Reader. Protection depends on OS account and filesystem controls.
- Operator-configured Readest-compatible and KOReader sync URLs are not restricted to HTTPS. Use only trusted TLS endpoints; transport enforcement remains future work.
- Ebook parsing and archive handling do not yet have comprehensive fuzzing, decompression quotas, or per-file resource limits. Malformed or very large books may cause crashes or resource exhaustion.
- The project does not yet document a release-signing, automatic-update, or security-advisory delivery policy for end users.

## Out of Scope

- A compromised operating system, WebView runtime, local OS account, or physical device.
- Malicious locally modified builds or dependencies added outside the reviewed lockfiles.
- Vulnerabilities in third-party services themselves, except where Bridge Reader fails to validate or contain their responses.
- Availability or confidentiality guarantees for operator-configured sync servers.
- Social engineering, account recovery, and multi-user authorization; Bridge Reader has no in-app account system today.

## Incident Response

For a confirmed vulnerability, maintainers should:

1. **Triage:** reproduce the issue, determine affected commits and platforms, assign severity, and identify exposed assets and boundaries.
2. **Contain:** disable or narrow the affected path when feasible, rotate exposed credentials, and prepare user guidance without publishing exploit details.
3. **Remediate:** fix the shared root cause, add the smallest regression that proves the boundary, and review adjacent callers and data paths.
4. **Release:** publish a patched revision or build, disclose the affected range and mitigations, and credit the reporter when requested.
5. **Review:** record the timeline and root cause, then update this threat model, tests, and release process where the incident exposed a missing control.

### Severity Guide

| Severity | Examples |
| --- | --- |
| Critical | Remote code execution, arbitrary native command execution, or broad credential/library compromise without user interaction. |
| High | Arbitrary file read/write, persistent script execution from a book, credential exposure, or unauthorized destructive restore. |
| Medium | Limited data disclosure, constrained path escape, significant denial of service, or a security control bypass requiring user action. |
| Low | Minor information exposure or hardening issue with limited practical impact. |

Severity depends on demonstrated impact, exploitability, required user interaction, and the affected trust boundary.
