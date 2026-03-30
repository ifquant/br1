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
});
