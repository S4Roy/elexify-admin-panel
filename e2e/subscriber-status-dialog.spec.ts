import { test, expect } from '@playwright/test';
test.use({ channel: 'chrome', video: 'off' });
test('subscriber dialog opens without invalid styling and saves a chosen exclusion', async ({ page }) => {
  const contact = { _id: '507f1f77bcf86cd799439011', email: 'subscriber@example.com', status: 'pending', source: 'web' };
  let saved: any;
  await page.addInitScript(() => {
    localStorage.setItem('ELEXIFY-TOKEN', 'ui-test-token');
    localStorage.setItem('ELEXIFY-USER', JSON.stringify({ _id: '507f1f77bcf86cd799439010', name: 'Preview tester' }));
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: any = {};
    if (path.endsWith('/admin/role/me')) data = { permissions: ['subscribers.view', 'subscribers.update'] };
    else if (path.endsWith('/subscriber/list')) data = { docs: [contact], totalDocs: 1, page: 1, limit: 50, totalPages: 1 };
    else if (path.endsWith('/subscriber/edit')) { saved = route.request().postDataJSON(); data = { ...contact, status: saved.status }; }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'success', data }) });
  });
  await page.goto('/subscriber');
  await page.getByRole('button', { name: 'Manage subscription for subscriber@example.com' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.mat-form-field-invalid')).toHaveCount(0);
  expect(await dialog.locator('.subscriber-summary').evaluate(el => {
    const content = el.closest('mat-dialog-content')!.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return box.left >= content.left + 16 && box.right <= content.right - 16;
  })).toBe(true);
  await dialog.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Suppressed', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toBeHidden();
  expect(saved).toEqual({ _id: contact._id, status: 'suppressed' });
});
