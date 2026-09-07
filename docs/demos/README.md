# README Media

## Current Reader Screenshots

The `br1-*-english.png` images show the running br1 web reader with Jane Austen's
*Pride and Prejudice*, [Project Gutenberg ebook 1342](https://www.gutenberg.org/ebooks/1342).
The screenshots use its unmodified [EPUB without images](https://www.gutenberg.org/ebooks/1342.epub.noimages),
downloaded on 2026-09-07 (SHA-256
`c25cf3d9ad4d41147ecc6947debcf981a961fd6b69a4219d9892af50b934c8bb`).

The browser profile starts empty. No test books, seeded library records,
Chinese books, personal library data, or simulated assistance responses appear.
The English reading note was written for this showcase and saved through the
reader's normal annotation action. Interface labels remain in the app's current
language; no DOM text, CSS, or screenshot pixels were replaced for presentation.

Reading-surface images are captured directly from that region in window mode;
the notes image includes the workspace. These are not full desktop-window
captures. The long contents sidebar is hidden for the workspace image, using
the existing control. A full-page capture with the long contents sidebar open
currently pushes the reading surface below the first viewport; this documentation
change does not repair that layout. Parallel panes show two chapters of the same book.
These captures demonstrate visible reading controls, selection and annotation,
not packaged desktop, external translation, or audible TTS acceptance.

With the dev server on port 1420, run:

```sh
node docs/demos/capture-reader-screenshots.mjs /path/to/pride-and-prejudice.epub
```

## Future Concept Animations

These are authored, deterministic animations for the Bridge Reader README.
They illustrate proposed workflows, not current br1 features or recordings of
an automatic book-to-game or book-to-animation pipeline. The replay and rendering
scripts do not call any model or media-generation service. No child study or
historical simulation was conducted.

### Watch and Replay

- [Ancient strategy concept](../images/war-book-concept.gif)
- [Grimm story concept](../images/grimm-story-concept.gif)
- [Browser replay with playback controls](reading-concepts.html)

Download or clone the repository and open `reading-concepts.html` locally to
use the replay. GitHub displays the HTML source rather than running it.
The GIFs are silent; the HTML replay provides pause/resume, restart, a story
selector, and a readable phase transcript on narrow screens.

### Sources and Adaptation

#### The Art of War

Source: Sun Tzu, *The Art of War*, Chapter VI, paragraph 30, Lionel Giles's
1910 translation, [Project Gutenberg ebook 132](https://www.gutenberg.org/files/132/132-h/132-h.htm).

The displayed sentence is a quotation. The valley, armies, routes, ford,
changed terrain, and reading questions are original illustrative additions.
Their outcomes are scripted toy examples, not claims about an actual battle,
the effectiveness of military advice, or a validated interpretation of the book.

#### The Frog Prince

Source: Jacob and Wilhelm Grimm, *The Frog-Prince*, in the collection based on
translations by Edgar Taylor and Marian Edwardes,
[Project Gutenberg ebook 2591](https://www.gutenberg.org/files/2591/2591-h/2591-h.htm).

The source card quotes a short excerpt from the opening paragraph, also used
in the synchronized transcript. The golden ball, frog, and promise provide
the narrative starting point. This edition describes a spring; the round
well in the drawing is our staging choice. The other retelling, illustrated
characters, staging, and discussion question are an original adaptation,
not a complete or verbatim edition. This concept
suggests a primary-school reading activity; it has not been evaluated for
age suitability or learning outcomes. A teacher or parent would need to review
both the chosen source edition and any generated adaptation before use.

The drawings are original, AI-assisted, code-authored artwork. No product screenshots,
film frames, or third-party character artwork are used in these two GIFs.
The real br1 screenshots elsewhere in the README remain separate product evidence.

### Reproduce

The standalone HTML contains the drawings and timeline. The Node renderer
samples that timeline with Playwright; the Python script encodes the rendered
frames with Pillow. These tools create documentation assets only and are not
part of the br1 reader runtime.

Requirements: the repository's installed Playwright dependency and Chromium,
Python 3, and Pillow. The renderer creates a new temporary directory inside the
given parent, creating that parent when needed; it does not clear existing data.

```sh
FRAMES="$(node docs/demos/render-reading-concepts.mjs /tmp --posters)"
python3 docs/demos/encode-reading-concepts.py "$FRAMES" docs/images
```

The GIFs use a shared 48-color palette and 240 frames at 1200x720. Alternating
80/90 ms frame delays preserve an exact 20-second loop. They are committed so
viewing the README needs no rendering tools or external service. On a narrow
screen, use the HTML replay's synchronized text transcript, or open a GIF at
full size to inspect its small source labels.
