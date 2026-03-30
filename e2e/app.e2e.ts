describe('br1 desktop app', () => {
  const switchToLibraryWindow = async () => {
    const handles = await browser.getWindowHandles();

    for (const handle of handles) {
      await browser.switchToWindow(handle);
      const libraryPage = await $('.library-page');
      if (await libraryPage.isExisting()) {
        return handle;
      }
    }

    throw new Error('expected at least one library window to remain open');
  };

  const openReaderFromBook = async (book: WebdriverIO.Element) => {
    const initialHandles = await browser.getWindowHandles();
    await book.click();

    await browser.waitUntil(async () => {
      const handles = await browser.getWindowHandles();
      return handles.length > initialHandles.length;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected a reader window to open after clicking a library book'
    });

    const nextHandles = await browser.getWindowHandles();
    const readerHandle = nextHandles.find((handle) => !initialHandles.includes(handle));
    expect(readerHandle).toBeTruthy();

    await browser.switchToWindow(readerHandle!);
    return readerHandle!;
  };

  const switchReaderToNotesTab = async () => {
    const notesTab = await $('//button[@role="tab" and normalize-space()="笔记"]');
    await notesTab.waitForDisplayed({ timeout: 10000 });
    await notesTab.click();
  };

  const clearAllReaderNotes = async () => {
    await browser.execute(() => {
      window.confirm = () => true;
    });
    await switchReaderToNotesTab();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const deleteButtons = await $$('.note-action.danger');
      if (!deleteButtons.length) break;
      await deleteButtons[0].click();
      await browser.pause(150);
    }

    await browser.waitUntil(async () => {
      const deleteButtons = await $$('.note-action.danger');
      return deleteButtons.length === 0;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the reader notes list to be empty before seeding legacy notes'
    });
  };

  it('shows the library route by default', async () => {
    const url = await browser.getUrl();
    expect(url).toMatch(/library|localhost/);
  });

  it('renders the library surface', async () => {
    const library = await $('.library-page');
    await library.waitForDisplayed({ timeout: 15000 });
    expect(await library.isDisplayed()).toBe(true);
  });

  it('shows the library search input', async () => {
    const searchInput = await $('[aria-label="Search books"]');
    await searchInput.waitForDisplayed({ timeout: 10000 });
    expect(await searchInput.isDisplayed()).toBe(true);
  });

  it('shows the bookshelf with at least one openable book', async () => {
    const shelf = await $('[aria-label="你的书库"]');
    await shelf.waitForExist({ timeout: 10000 });
    expect(await shelf.isExisting()).toBe(true);

    const openableBooks = await $$('[aria-label^="Open "][aria-label$=" in reader"]');
    expect(openableBooks.length).toBeGreaterThan(0);
  });

  it('can execute JavaScript inside the desktop webview', async () => {
    const readyState = await browser.execute(() => document.readyState);
    expect(readyState).toBe('complete');
  });

  it('opens the first library book in a separate reader window', async () => {
    await switchToLibraryWindow();

    const [firstBook] = await $$('[aria-label^="Open "][aria-label$=" in reader"]');
    expect(firstBook).toBeTruthy();

    const initialHandles = await browser.getWindowHandles();
    await firstBook.click();

    await browser.waitUntil(async () => {
      const handles = await browser.getWindowHandles();
      return handles.length > initialHandles.length;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected a reader window to open after clicking the first book'
    });

    const nextHandles = await browser.getWindowHandles();
    const readerHandle = nextHandles.find((handle) => !initialHandles.includes(handle));
    expect(readerHandle).toBeTruthy();

    await browser.switchToWindow(readerHandle!);

    const readerShell = await $('.reader-shell');
    await readerShell.waitForDisplayed({ timeout: 10000 });
    expect(await readerShell.isDisplayed()).toBe(true);

    const readerChrome = await $('[aria-label="reader window chrome"]');
    await readerChrome.waitForExist({ timeout: 10000 });
    expect(await readerChrome.isExisting()).toBe(true);

    const readerStage = await $('[aria-label="reader stage"]');
    await readerStage.waitForDisplayed({ timeout: 10000 });
    expect(await readerStage.isDisplayed()).toBe(true);
  });

  it('loads metadata after opening the first library book', async () => {
    await switchToLibraryWindow();

    const [firstBook] = await $$('[aria-label^="Open "][aria-label$=" in reader"]');
    expect(firstBook).toBeTruthy();

    const initialHandles = await browser.getWindowHandles();
    await firstBook.click();

    await browser.waitUntil(async () => {
      const handles = await browser.getWindowHandles();
      return handles.length > initialHandles.length;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected a reader window to open before checking reader metadata'
    });

    const nextHandles = await browser.getWindowHandles();
    const readerHandle = nextHandles.find((handle) => !initialHandles.includes(handle));
    expect(readerHandle).toBeTruthy();

    await browser.switchToWindow(readerHandle!);

    await browser.waitUntil(async () => {
      const details = await browser.execute(() => {
        const view = document.querySelector('foliate-view') as
          | (HTMLElement & {
              book?: { metadata?: { title?: unknown } };
              lastLocation?: {
                total?: number;
                location?: { total?: number };
              };
            })
          | null;

        const titleValue = view?.book?.metadata?.title;
        const title =
          typeof titleValue === 'string'
            ? titleValue
            : titleValue && typeof titleValue === 'object' && 'en' in titleValue
              ? String((titleValue as Record<string, unknown>).en ?? '')
              : null;

        const stageError = document.querySelector('.stage-error')?.textContent?.trim() ?? null;
        const total =
          view?.lastLocation?.location?.total ??
          view?.lastLocation?.total ??
          null;

        return {
          title,
          total,
          stageError
        };
      });

      return !details.stageError && typeof details.total === 'number' && details.total > 0;
    }, {
      timeout: 15000,
      timeoutMsg: 'expected the first book to load without a stage error and expose location state'
    });
  });

  it('keeps the rendered book page inside the reader stage instead of the sidebar column', async () => {
    await switchToLibraryWindow();

    const [firstBook] = await $$('[aria-label^="Open "][aria-label$=" in reader"]');
    expect(firstBook).toBeTruthy();

    const initialHandles = await browser.getWindowHandles();
    await firstBook.click();

    await browser.waitUntil(async () => {
      const handles = await browser.getWindowHandles();
      return handles.length > initialHandles.length;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected a reader window to open before checking content geometry'
    });

    const nextHandles = await browser.getWindowHandles();
    const readerHandle = nextHandles.find((handle) => !initialHandles.includes(handle));
    expect(readerHandle).toBeTruthy();

    await browser.switchToWindow(readerHandle!);

    const readGeometry = () =>
      browser.execute(() => {
        const stage = document.querySelector('.reader-stage');
        const sidebar = document.querySelector('.reader-sidebar');
        const workspace = document.querySelector('.workspace');
        const shell = document.querySelector('.reader-shell');
        const canvas = document.querySelector('.canvas');
        const viewport = document.querySelector('.viewport-shell');
        const engineHost = document.querySelector('.engine-host');
        const engineStage = document.querySelector('.engine-stage');
        const view = document.querySelector('foliate-view') as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null;
        const paginator = view?.shadowRoot?.querySelector('foliate-paginator') as HTMLElement | null;
        const frame = paginator?.shadowRoot?.querySelector('iframe') as HTMLElement | null;
        const rendered = frame ?? paginator ?? view;

        const rectOf = (node: Element | null) => {
          if (!node) return null;
          const rect = node.getBoundingClientRect();
          return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            right: rect.right,
            bottom: rect.bottom
          };
        };

        return {
          stage: rectOf(stage),
          sidebar: rectOf(sidebar),
          workspace: rectOf(workspace),
          shell: rectOf(shell),
          canvas: rectOf(canvas),
          viewport: rectOf(viewport),
          engineHost: rectOf(engineHost),
          engineStage: rectOf(engineStage),
          foliateView: rectOf(view),
          paginator: rectOf(paginator),
          frame: rectOf(frame),
          rendered: rectOf(rendered),
          workspaceColumns: workspace ? getComputedStyle(workspace).gridTemplateColumns : null
        };
      });

    let geometry = await readGeometry();

    await browser.waitUntil(async () => {
      geometry = await readGeometry();
      const rendered = geometry.rendered;
      if (!geometry.stage || !geometry.sidebar || !rendered) return false;

      return (
        rendered.left >= geometry.stage.left - 4 &&
        rendered.left >= geometry.sidebar.right - 4 &&
        rendered.top <= geometry.stage.top + geometry.stage.height * 0.25 &&
        rendered.width >= geometry.stage.width * 0.25 &&
        rendered.height >= geometry.stage.height * 0.25
      );
    }, {
      timeout: 20000,
      timeoutMsg: 'expected the rendered book page to stay inside the reader stage instead of slipping into the sidebar area'
    }).catch(async (error) => {
      geometry = await readGeometry();
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nGeometry: ${JSON.stringify(geometry)}`
      );
    });
  });

  it('migrates legacy browser notes into the host-side book store when reopening a book', async () => {
    const libraryHandle = await switchToLibraryWindow();
    const [firstBook] = await $$('[aria-label^="Open "][aria-label$=" in reader"]');
    expect(firstBook).toBeTruthy();

    const href = await firstBook.getAttribute('href');
    expect(href).toBeTruthy();

    const target = new URL(href!, 'http://localhost');
    const bookKey =
      target.searchParams.get('path') ||
      target.searchParams.get('url') ||
      target.searchParams.get('label') ||
      'default';
    const notesStorageKey = `br1.reader.notes:${bookKey}`;

    await openReaderFromBook(firstBook);
    await clearAllReaderNotes();
    await browser.execute((key) => {
      localStorage.removeItem(key);
    }, notesStorageKey);

    const readLocation = async () =>
      browser.execute(() => {
        const view = document.querySelector('foliate-view') as
          | (HTMLElement & {
              lastLocation?: {
                cfi?: string;
                tocItem?: { label?: string; href?: string };
              };
            })
          | null;

        return {
          cfi: view?.lastLocation?.cfi ?? null,
          chapterLabel: view?.lastLocation?.tocItem?.label ?? null,
          chapterHref: view?.lastLocation?.tocItem?.href ?? null
        };
      });

    await browser.waitUntil(async () => {
      const location = await readLocation();
      return !!location.cfi;
    }, {
      timeout: 15000,
      timeoutMsg: 'expected the first book to expose a valid CFI before seeding legacy notes'
    });

    const location = await readLocation();
    const legacyNote = {
      id: `legacy:${Date.now()}`,
      cfi: location.cfi!,
      text: 'legacy migrated note text',
      note: 'legacy migrated note body',
      chapterLabel: location.chapterLabel || 'Legacy chapter',
      chapterHref: location.chapterHref || '',
      createdAt: Date.now()
    };

    await browser.execute(([key, note]) => {
      localStorage.setItem(key, JSON.stringify([note]));
    }, [notesStorageKey, legacyNote] as const);
    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);

    const [sameBook] = await $$('[aria-label^="Open "][aria-label$=" in reader"]');
    expect(sameBook).toBeTruthy();
    await openReaderFromBook(sameBook);

    await switchReaderToNotesTab();

    await browser.waitUntil(async () => {
      const noteCards = await $$('.note-card');
      if (!noteCards.length) return false;
      const noteBody = await $('.note-body');
      return (await noteBody.getText()) === legacyNote.note;
    }, {
      timeout: 15000,
      timeoutMsg: 'expected the migrated legacy note to appear in the notes panel after reopening the book'
    }).catch(async (error) => {
      const debug = await browser.execute((key) => ({
        legacyRaw: localStorage.getItem(key),
        noteCardCount: document.querySelectorAll('.note-card').length,
        noteBodies: Array.from(document.querySelectorAll('.note-body')).map((node) => node.textContent?.trim() ?? '')
      }), notesStorageKey);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nDebug: ${JSON.stringify(debug)}`
      );
    });

    await browser.waitUntil(async () => {
      const raw = await browser.execute((key) => localStorage.getItem(key), notesStorageKey);
      return raw === null;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the legacy browser notes key to be removed after host migration'
    });

    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    const [thirdOpen] = await $$('[aria-label^="Open "][aria-label$=" in reader"]');
    expect(thirdOpen).toBeTruthy();
    await openReaderFromBook(thirdOpen);
    await switchReaderToNotesTab();

    await browser.waitUntil(async () => {
      const noteBody = await $('.note-body');
      return (await noteBody.getText()) === legacyNote.note;
    }, {
      timeout: 10000,
      timeoutMsg: 'expected the migrated note to survive a second reopen after the legacy browser key was removed'
    });

    await clearAllReaderNotes();
    await browser.closeWindow();
    await browser.switchToWindow(libraryHandle);
    await browser.execute((key) => {
      localStorage.removeItem(key);
    }, notesStorageKey);
  });
});
