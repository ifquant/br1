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

These are authored scene animations, not recordings of br1 generating anything.
The battle diagram animates a classic strategy; the fairy-tale scene animates
characters and a door to tell a short story. Neither is a camera zoom over a
still illustration or a simulated reader interface. Automatic book-to-game and
book-to-animation features remain future directions. No child study or
validated battle simulation was conducted.

### Watch and Replay

- [Cannae: double envelopment](../images/war-book-concept.gif)
- [Grimm story concept](../images/grimm-story-concept.gif)
- [Browser replay with playback controls](reading-concepts.html)

Download or clone the repository and open `reading-concepts.html` locally to
use the replay. GitHub displays the HTML source rather than running it.
The GIFs are silent. The HTML replay provides pause/resume, restart, a story
selector, and readable captions. It starts paused when reduced motion is
preferred. The replay's text also describes each phase without requiring motion.

GitHub renders committed GIFs in the README but does not run JavaScript from
linked HTML. A local commit alone does not update GitHub: the commit and its
media files must also be pushed to the repository's displayed branch.

GitHub can pause animated images when a visitor prefers reduced motion. In
that case its play control starts the animation; see
[GitHub's animated-image accessibility setting](https://docs.github.com/en/account-and-profile/how-tos/account-settings/managing-accessibility-settings).

### Sources and Adaptation

#### Cannae: Polybius, The Histories

Source: *The Histories*, Book III, sections 113-116, in the public-domain
1922 Loeb edition hosted by the University of Chicago:
[formation and battle account](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/3%2A.html#113).

The four beats show the forward center, its retreat under Roman pressure,
the African infantry turning onto the Roman flanks, and cavalry attacking
the rear after success against the opposing cavalry. This is a schematic
explanation of double envelopment, not a claim that every movement was a
precisely controlled feint or that the pattern guarantees victory.

Positions, spacing, colors, unit symbols, arrows, and time compression are
editorial choices. They do not reconstruct exact geography, troop strengths,
casualties, or battle duration. The preliminary cavalry fighting and many
other events are omitted. No outcome is calculated by a military simulation.

#### The Frog Prince

Inspiration: Jacob and Wilhelm Grimm, *The Frog-Prince*, in the collection based on
translations by Edgar Taylor and Marian Edwardes,
[Project Gutenberg ebook 2591](https://www.gutenberg.org/files/2591/2591-h/2591-h.htm).

The selected moment is the frog arriving at the castle door. In this edition,
the princess initially shuts the door and her father reminds her to keep her
promise, after which she lets the frog in. The short animation compresses this
into arrival, hesitation, opening, and welcome; the external phase caption
retains the father's role. The welcoming gesture and courtyard staging are
our adaptation, not a quotation or a complete retelling. This concept
suggests a primary-school reading activity; it has not been evaluated for
age suitability or learning outcomes. A teacher or parent would need to review
both the chosen source edition and any generated adaptation before use.

The [castle courtyard background](../images/grimm-courtyard.png) was generated
with OpenAI's image-generation tool on 2026-09-07, without a reference image.
The characters, door, and battle diagram are original Canvas drawings with
scripted motion. No film frames or third-party character artwork are used.
The generated background is illustration, not source-document evidence.
The real br1 screenshots elsewhere in the README remain separate product evidence.

### Reproduce

The standalone HTML loads the courtyard PNG and the local `cannae-scene.js`
drawing script. The Node renderer samples exact timestamps with Playwright; the
Python script encodes rendered frames with Pillow. Regenerating the GIFs
does not call any model or media-generation service. The painted background is not
deterministically regenerated by these scripts. These are documentation tools,
not part of the br1 reader runtime.

Requirements: the repository's installed Playwright dependency and Chromium,
Python 3, and Pillow. The renderer creates a new temporary directory inside the
given parent, creating that parent when needed; it does not clear existing data.

```sh
FRAMES="$(node docs/demos/render-reading-concepts.mjs /tmp --posters)"
python3 docs/demos/encode-reading-concepts.py "$FRAMES" docs/images
```

Each GIF must stay within 512 KB (the encoder enforces a 512,000-byte limit).
The loops use a fixed camera and a shared palette, keeping unchanged background
pixels stable while the characters and formations move. Input sampling is
480x270 at 10 fps for 12 seconds; repeated hold frames may be combined in GIF
encoding without changing total duration. They are committed so viewing the
README needs no rendering tools or external service.
