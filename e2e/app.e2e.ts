describe('br1 desktop app', () => {
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
});
