# Bridge Reader

Bridge Reader is an AI-native reading app for readers who want to break through cognitive bottlenecks, not just finish more pages.

It treats AI as a medium between author and reader: a way to dissect a book, push against it, transfer its ideas across domains, and turn limited text into a much larger space for exploration. A student can use it to question a textbook, a researcher can use it to follow unfamiliar arguments, and a strategist can use it to transform ideas from history, philosophy, or literature into practical models.

Bridge Reader is built for knowledge transfer, abstraction, divergence, and practice. It is for readers who believe a book is not a static container of information, but a living conversation that can be reopened, challenged, translated, and applied.

## Screenshots

### Library

<p align="center">
  <img src="docs/images/br1-app-screenshot.png" alt="Bridge Reader library screen" width="100%">
</p>

### Parallel Reading

<p align="center">
  <img src="docs/images/br1-parallel-reading-screenshot.png" alt="Bridge Reader parallel reading view" width="100%">
</p>

## What It Helps You Do

- Read EPUB, PDF, and TXT books in one focused local library.
- Keep reading progress, notes, and highlights close to the text.
- Compare two passages or reading contexts side by side with parallel reading.
- Use AI-oriented reading workflows to question, decompose, debate, and transfer ideas.
- Move from understanding a book to applying its structure in another field.

## Current Features

| Area | Status |
| --- | --- |
| Local library | Organize and reopen books from a reader-focused shelf. |
| Formats | Read EPUB, PDF, and TXT files. |
| Reading progress | Continue from saved reading positions. |
| Notes and highlights | Capture important passages and reading context. |
| Parallel reading | Place two reading panes side by side for comparison and cross-context study. |

## Run locally

```sh
pnpm install
pnpm dev --host 127.0.0.1
```

Then open `http://127.0.0.1:1420/`.

## Build

Build the web frontend:

```sh
pnpm build
```

Build the Tauri desktop app and installers:

```sh
pnpm tauri build
```

The Tauri build runs the SvelteKit build first and writes platform bundles under `src-tauri/target/release/bundle/`.

## Release

1. Update `version` in `package.json` and `src-tauri/tauri.conf.json`.
2. Run `pnpm check`.
3. Run `pnpm build`.
4. Run `pnpm tauri build`.
5. Upload the generated files from `src-tauri/target/release/bundle/` to the GitHub release.

## Acknowledgements

Bridge Reader is technically inspired by the open-source ebook reader [Readest](https://github.com/readest/readest) and the broader Foliate reading ecosystem, while exploring a more AI-native direction for deep reading and cross-domain knowledge transfer.
