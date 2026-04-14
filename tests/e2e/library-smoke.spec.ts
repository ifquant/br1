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
