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
