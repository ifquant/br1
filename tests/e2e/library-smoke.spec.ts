import { expect, test } from '@playwright/test';

test('library renders the reading-first shell in web mode', async ({ page }) => {
  await page.goto('/library');

  const searchbox = page.getByRole('searchbox', { name: 'Search books' });

  await expect(searchbox).toHaveAttribute(
    'placeholder',
    /在 5 本书籍中搜索/i
  );
  await expect(page.getByRole('heading', { name: '继续阅读' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '最近导入' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open 政治秩序与政治衰败 in reader/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Import books from the system/i })).toBeVisible();

  await searchbox.fill('does-not-exist');
  await expect(page.getByRole('link', { name: /Open 政治秩序与政治衰败 in reader/i })).toHaveCount(0);
});
