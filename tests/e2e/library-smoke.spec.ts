import { expect, test } from '@playwright/test';

test('library renders the reading-first shell in web mode', async ({ page }) => {
  await page.goto('/library');

  const searchbox = page.getByRole('searchbox', { name: 'Search books' });

  await expect(searchbox).toHaveAttribute(
    'placeholder',
    /在 5 本书籍中搜索/i
  );
  await expect(page.getByRole('heading', { name: '继续阅读' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '最近阅读' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '你的书库' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Continue reading 政治秩序与政治衰败/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Continue reading 胡雪岩/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Import books from the system/i })).toBeVisible();
  await expect(page.locator('input.import-input[type="file"]').first()).toHaveAttribute(
    'accept',
    '.epub,.pdf,.mobi,.azw3,.fb2,.cbz,.txt'
  );

  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitemradio', { name: '书名' }).click();
  await expect(page.getByRole('heading', { name: '继续阅读' })).toBeVisible();

  await searchbox.fill('does-not-exist');
  await expect(page.getByRole('heading', { name: '继续阅读' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '最近阅读' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '搜索结果' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '你的书库' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Open 政治秩序与政治衰败 in reader/i })).toHaveCount(0);
});

test('reader opens txt assets in web mode', async ({ page }) => {
  await page.goto(
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book'
  );

  const footer = page.getByLabel('reader footer controls preview');

  await expect(page.locator('.stage-error')).toHaveCount(0);
  await expect(footer).toContainText('TXT');
  await expect(footer).toContainText('SCROLL');
  await expect(page.getByLabel('plain text reading surface')).toBeVisible();
  await expect(page.getByText(/This plain text file exists to verify/i)).toBeVisible();
});

test('reader shows explicit text-annotation limits for txt and cbz assets in web mode', async ({ page }) => {
  const cases = [
    {
      assetPath: '/samples/sample-comic.cbz',
      label: 'Sample CBZ Book',
      message: '当前 CBZ 只支持阅读进度和书签，还不支持正文文本批注。'
    }
  ] as const;

  for (const sample of cases) {
    await page.goto(
      `/reader?source=asset&url=${encodeURIComponent(sample.assetPath)}&label=${encodeURIComponent(sample.label)}`
    );
    await page.getByRole('tab', { name: '笔记' }).click();
    await expect(page.getByLabel('notes panel preview')).toContainText(sample.message);
    await expect(page.getByRole('button', { name: '当前格式暂不支持批注' })).toBeDisabled();
  }
});

test('reader supports txt notes through selection, persistence, and note reopen in web mode', async ({ page }) => {
  const readerUrl =
    '/reader?source=asset&url=%2Fsamples%2Fsample-book.txt&label=Sample%20TXT%20Book';
  const selectText = async (needle: string) => {
    await page.evaluate((targetText) => {
      const pre = document.querySelector('.plain-text-paper pre');
      if (!pre || !pre.firstChild) throw new Error('expected the plain text surface to exist');
      const textNode = pre.firstChild;
      const raw = textNode.textContent ?? '';
      const start = raw.indexOf(targetText);
      if (start < 0) throw new Error(`expected the TXT fixture text to contain "${targetText}"`);
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, start + targetText.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, needle);
  };

  await page.goto(readerUrl);
  await page.getByRole('tab', { name: '笔记' }).click();
  const noteButton = page.locator('.primary-note-action');
  const highlightButton = page.locator('.secondary-note-action');
  await expect(noteButton).toBeDisabled();
  await expect(highlightButton).toBeDisabled();

  await selectText('plain text file exists');

  await expect(page.locator('.selection-card p')).toContainText('plain text file exists');
  await expect(noteButton).toBeEnabled();
  await expect(highlightButton).toBeEnabled();
  await expect(noteButton).toHaveText('为当前选中内容记笔记');
  await expect(highlightButton).toHaveText('先高亮当前选中内容');

  await highlightButton.click();
  await expect(page.locator('.note-card').first()).toContainText('高亮');
  await expect(page.locator('.note-card').first()).toContainText('plain text file exists');

  await page.locator('.plain-text-surface').evaluate((element) => {
    const maxScroll = element.scrollHeight - element.clientHeight;
    if (maxScroll <= 0) {
      throw new Error('expected the TXT fixture to produce a scrollable plain-text surface');
    }
    element.scrollTop = maxScroll * 0.35;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await selectText('The rest of this fixture just adds enough steady reading length');
  await expect(page.locator('.selection-card p')).toContainText(
    'The rest of this fixture just adds enough steady reading length'
  );

  await highlightButton.click();
  await expect(page.locator('.notes-meta-row')).toContainText('2 高亮');
  await expect(page.locator('.notes-meta-row')).toContainText('0 笔记');

  await selectText('the book opens, the state moves, and the state comes back');
  await expect(page.locator('.selection-card p')).toContainText(
    'the book opens, the state moves, and the state comes back'
  );

  page.once('dialog', (dialog) => dialog.accept('txt note body'));
  await noteButton.click();
  await expect(page.locator('.note-card', { hasText: 'txt note body' })).toContainText('txt note body');
  await expect(page.locator('.notes-meta-row')).toContainText('2 高亮');
  await expect(page.locator('.notes-meta-row')).toContainText('1 笔记');

  const progressBeforeJump = await page
    .locator('[aria-label="reader footer controls preview"]')
    .textContent();

  await page.locator('.plain-text-surface').evaluate((element) => {
    const maxScroll = element.scrollHeight - element.clientHeight;
    if (maxScroll <= 0) {
      throw new Error('expected the TXT fixture to produce a scrollable plain-text surface');
    }
    element.scrollTop = maxScroll * 0.8;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await expect(page.locator('[aria-label="reader footer controls preview"]')).not.toHaveText(progressBeforeJump ?? '');

  await page.locator('.note-card', { hasText: 'txt note body' }).locator('.note-link').click();
  await expect(page.locator('[aria-label="reader footer controls preview"]')).toHaveText(progressBeforeJump ?? '');

  const notesMetaRow = page.locator('.notes-meta-row');
  const notesCards = page.locator('.note-card');
  const kindFilters = page.getByLabel('annotation kind filter controls');
  await kindFilters.getByRole('button', { name: '高亮', exact: true }).click();
  await expect(notesMetaRow).toContainText('仅看高亮');
  await expect(notesCards).toHaveCount(2);
  await expect(notesCards.first()).toContainText('高亮');
  await expect(page.getByText('当前筛选下还没有高亮')).toHaveCount(0);

  await kindFilters.getByRole('button', { name: '笔记', exact: true }).click();
  await expect(notesMetaRow).toContainText('仅看笔记');
  await expect(notesCards).toHaveCount(1);
  await expect(notesCards.first()).toContainText('txt note body');
  await expect(notesCards.first()).not.toContainText('高亮');

  await kindFilters.getByRole('button', { name: '全部类型', exact: true }).click();
  await expect(notesMetaRow).toContainText('全部类型');
  await expect(notesCards).toHaveCount(3);

  await page.getByRole('tab', { name: '高亮' }).click();
  const highlightCards = page.locator('.highlight-card');
  const highlightsPanel = page.getByLabel('highlights panel preview');
  await expect(highlightsPanel).toContainText('已保存 2 条高亮');
  await expect(highlightsPanel).toContainText('最近添加优先');
  await expect(highlightCards).toHaveCount(2);
  await expect(highlightCards.first()).toContainText('The rest of this fixture just adds enough steady reading length');
  await expect(highlightCards.first()).toContainText('高亮');
  await expect(highlightCards.first()).not.toContainText('txt note body');
  const highlightSortControls = page.getByLabel('highlights sort controls');
  await highlightSortControls.getByRole('button', { name: '最早添加', exact: true }).click();
  await expect(highlightsPanel).toContainText('最早添加优先');
  await expect(highlightCards.first()).toContainText('plain text file exists');
  await page.getByRole('button', { name: '选中本组高亮' }).click();
  await expect(highlightsPanel).toContainText('已选 2 条');
  await page.getByRole('button', { name: '已选高亮' }).click();
  await expect(highlightsPanel).toContainText('2 已选高亮');
  await expect(highlightCards).toHaveCount(2);
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.getByRole('button', { name: '清空本组选择' }).click();
  await expect(highlightsPanel).toContainText('未选高亮');
  await highlightSortControls.getByRole('button', { name: '最近添加', exact: true }).click();
  await expect(highlightsPanel).toContainText('最近添加优先');
  await expect(highlightCards.first()).toContainText('The rest of this fixture just adds enough steady reading length');
  await highlightSortControls.getByRole('button', { name: '最早添加', exact: true }).click();
  await highlightCards.first().locator('.highlight-selection-toggle').click();
  await expect(highlightsPanel).toContainText('已选 1 条');
  await page.getByRole('button', { name: '已选高亮' }).click();
  await expect(highlightsPanel).toContainText('1 已选高亮');
  await expect(highlightCards).toHaveCount(1);
  await expect(highlightCards.first()).toContainText('plain text file exists');
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await expect(highlightsPanel).toContainText('全部章节');
  await expect(highlightCards).toHaveCount(2);
  await page.getByRole('button', { name: '反选当前视图高亮' }).click();
  await expect(highlightsPanel).toContainText('已选 1 条');
  await expect(highlightCards.first().locator('.highlight-selection-toggle')).toHaveText('选中');
  await expect(highlightCards.nth(1).locator('.highlight-selection-toggle')).toHaveText('已选');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除选中高亮' }).click();
  await expect(highlightsPanel).toContainText('已保存 1 条高亮');
  await expect(highlightsPanel).toContainText('未选高亮');
  await expect(highlightCards).toHaveCount(1);
  await expect(highlightCards.first()).toContainText('plain text file exists');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除当前视图高亮' }).click();
  await expect(highlightCards).toHaveCount(0);
  await expect(page.getByLabel('highlights panel preview')).toContainText('还没有高亮');

  await page.getByRole('tab', { name: '笔记' }).click();
  await expect(page.locator('.notes-meta-row')).toContainText('0 高亮');
  await expect(page.locator('.notes-meta-row')).toContainText('1 笔记');
  await expect(page.locator('.note-card')).toHaveCount(1);
  await page.reload();
  await page.getByRole('tab', { name: '笔记' }).click();
  await expect(page.locator('.note-card', { hasText: 'txt note body' })).toContainText('txt note body');
  await expect(page.locator('.note-card', { hasText: '高亮' })).toHaveCount(0);
});

const sampleReaderCases = [
  {
    assetPath: '/samples/sample-book.fb2',
    label: 'Sample FB2 Book',
    format: 'FB2',
    layout: 'PAGINATED'
  },
  {
    assetPath: '/samples/sample-book.mobi',
    label: 'Sample MOBI Book',
    format: 'MOBI',
    layout: 'PAGINATED'
  },
  {
    assetPath: '/samples/sample-book.azw3',
    label: 'Sample AZW3 Book',
    format: 'AZW3',
    layout: 'PAGINATED'
  },
  {
    assetPath: '/samples/sample-comic.cbz',
    label: 'Sample CBZ Book',
    format: 'CBZ',
    layout: 'FIXED'
  },
  {
    assetPath: '/samples/sample-book.txt',
    label: 'Sample TXT Book',
    format: 'TXT',
    layout: 'SCROLL'
  }
] as const;

for (const sample of sampleReaderCases) {
  test(`reader opens ${sample.format} sample assets in web mode`, async ({ page }) => {
    await page.goto(
      `/reader?source=asset&url=${encodeURIComponent(sample.assetPath)}&label=${encodeURIComponent(sample.label)}`
    );

    const footer = page.getByLabel('reader footer controls preview');

    await expect(page.locator('.stage-error')).toHaveCount(0);
    await expect(page.getByText(new RegExp(`Failed to open ${sample.label}`, 'i'))).toHaveCount(0);
    await expect(footer).toContainText(sample.format);
    await expect(footer).toContainText(sample.layout);
    await expect(footer).not.toContainText('Opening book');
  });
}
