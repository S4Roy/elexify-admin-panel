import { test, expect } from '@playwright/test';
test.use({ channel: 'chrome', video: 'off' });
test('template iframe remains visible through editor change detection and refreshes on demand', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ELEXIFY-TOKEN', 'ui-test-token');
    localStorage.setItem('ELEXIFY-USER', JSON.stringify({ _id: '507f1f77bcf86cd799439010', name: 'Preview tester' }));
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: any = {};
    if (path.endsWith('/admin/role/me')) data = { permissions: ['email_template.manage'] };
    else if (path.endsWith('/abandoned_cart/preview')) data = { subject: 'You left something in your cart', html: '<!doctype html><html><body><h1>Your cart is waiting</h1><a href="https://play.google.com/store/apps/details?id=com.elexify">Get it on Google Play</a></body></html>', missingVariables: [], unresolvedFields: [] };
    else if (path.endsWith('/email-templates/abandoned_cart')) data = { action: 'abandoned_cart', subject: 'You left something in your cart', preheader: 'Your items are waiting.', body: '<p>Hi {{name}}</p>{{> ctaButton url=storefront_url text="Complete Purchase"}}', status: 'active' };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'success', data }) });
  });
  await page.goto('/settings/email-templates/abandoned_cart');
  const iframe = page.locator('iframe[title="Email template preview"]');
  await expect(iframe).toBeVisible();
  await page.evaluate(() => {
    (window as any).previewReloads = 0;
    new MutationObserver(records => { (window as any).previewReloads += records.length; })
      .observe(document.querySelector('iframe[title="Email template preview"]')!, { attributes: true, attributeFilter: ['srcdoc'] });
  });
  const subject = page.getByLabel('Subject', { exact: true });
  await subject.focus();
  for (let i = 0; i < 5; i++) await subject.press('End');
  expect(await page.evaluate(() => (window as any).previewReloads)).toBe(0);
  await expect(page.frameLocator('iframe[title="Email template preview"]').getByRole('heading', { name: 'Your cart is waiting' })).toBeVisible();
  await page.getByRole('button', { name: 'Refresh Preview', exact: true }).click();
  await expect(page.frameLocator('iframe[title="Email template preview"]').getByText('Get it on Google Play')).toBeVisible();
  const editor = page.locator('.ck-editor__editable[contenteditable="true"]').first();
  await expect(editor).toBeVisible();
  for (const width of [1440, 1100, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(async () => page.locator('.email-template-edit').evaluate(root => {
      const form = root.querySelector('form')!.getBoundingClientRect();
      const editor = root.querySelector('.ck-editor')!.getBoundingClientRect();
      return editor.right <= form.right + 1 && editor.width <= form.width + 1;
    })).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await editor.fill('Hello {{name}}, your cart is ready.');
  await expect(page.getByText('Action button', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Advanced source', exact: true }).click();
  const source = page.getByLabel('Template content', { exact: true });
  expect(await source.inputValue()).toContain('your cart is ready.');
  expect(await source.inputValue()).toContain('{{> ctaButton url=storefront_url text="Complete Purchase"}}');
  await page.getByRole('button', { name: 'Formatted editor', exact: true }).click();
  await expect(editor).toContainText('your cart is ready.');
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
  await expect(iframe).toHaveCSS('width', '375px');
});
