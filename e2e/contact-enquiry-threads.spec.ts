import { test, expect, Page } from '@playwright/test';

async function mockInbox(page: Page, canEdit = true) {
  await page.addInitScript(() => {
    localStorage.setItem('ELEXIFY-TOKEN', 'ui-test-token');
    localStorage.setItem('ELEXIFY-USER', JSON.stringify({ _id: '507f1f77bcf86cd799439010', name: 'Support Agent' }));
  });
  const contact = { _id: '507f1f77bcf86cd799439011', name: 'Asha Roy', email: 'asha@example.com', phone: '9000000000', subject: 'Order delivery question', message: 'When will my order arrive?', status: 'pending', priority: 'normal', source: 'web', created_at: '2026-10-12T08:00:00Z' };
  const messages: any[] = Array.from({ length: 21 }, (_, i) => ({ _id: `message-${i}`, kind: 'note', content: `Investigation ${i}`, author_name: 'Support Agent', created_at: new Date(Date.UTC(2026, 9, 12, 8, i + 1)).toISOString() }));
  const requests: any[] = [];
  const requestedPages: number[] = [];
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let data: any = {};
    if (path.endsWith('/admin/role/me')) data = { permissions: ['contacts.view', ...(canEdit ? ['contacts.update'] : [])] };
    else if (path.endsWith('/contact-us/list')) data = { docs: [contact], page: 1, limit: 50, totalDocs: 1, totalPages: 1 };
    else if (path.endsWith('/thread')) {
      const current = Number(url.searchParams.get('page') || 1);
      requestedPages.push(current);
      data = { contact, messages: { docs: [...messages].reverse().slice((current - 1) * 20, current * 20), page: current, limit: 20, totalDocs: messages.length, totalPages: Math.ceil(messages.length / 20) } };
    } else if (path.endsWith('/messages')) {
      const body = route.request().postDataJSON();
      requests.push(body);
      const entry = { ...body, _id: `new-${requests.length}`, author_name: 'Support Agent', created_at: new Date().toISOString(), ...(body.kind === 'reply' && { delivery_status: 'sent', recipient: contact.email }) };
      messages.push(entry);
      if (body.kind === 'reply') contact.status = 'answered';
      data = entry;
    } else if (path.endsWith('/contact-us/edit')) {
      Object.assign(contact, route.request().postDataJSON());
      data = contact;
    }
    await route.fulfill({ json: { status: 'success', data, message: 'Updated' } });
  });
  return { requests, requestedPages };
}

test('portal replies, private remarks, and conversation pagination', async ({ page }) => {
  const { requests, requestedPages } = await mockInbox(page);
  await page.goto('/contact-us');
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Open thread' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('When will my order arrive?')).toBeVisible();
  await dialog.getByLabel('Write your reply').fill('Your order will arrive tomorrow.');
  await dialog.getByRole('button', { name: 'Send reply', exact: true }).click();
  await expect(dialog.getByText('Your order will arrive tomorrow.', { exact: true })).toBeVisible();
  expect(requests[0].kind).toBe('reply');
  await dialog.getByRole('button', { name: 'Internal remark', exact: true }).click();
  await expect(dialog.getByText('Private to your support team. Never emailed to the customer.')).toBeVisible();
  await dialog.getByLabel('Add an internal remark').fill('Carrier confirmed delivery date.');
  await dialog.getByRole('button', { name: 'Add remark', exact: true }).click();
  await expect(dialog.getByText('Carrier confirmed delivery date.', { exact: true })).toBeVisible();
  expect(requests[1].kind).toBe('note');
  expect(requests[0].request_id).not.toBe(requests[1].request_id);
  await dialog.locator('[matTooltip="Next Page"]').click();
  await expect(dialog.getByText('Investigation 0', { exact: true })).toBeVisible();
  expect(requestedPages).toContain(2);
  await dialog.locator('mat-dialog-content').evaluate(el => { el.scrollTop = 0; });
  await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
  await page.screenshot({ path: 'test-results/contact-thread-desktop.png', fullPage: true });
});

test('view-only staff can read threads on mobile without reply controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockInbox(page, false);
  await page.goto('/contact-us');
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Open thread' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('When will my order arrive?')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Send reply', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Save workflow', exact: true })).toHaveCount(0);
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
  await page.screenshot({ path: 'test-results/contact-thread-mobile.png', fullPage: true });
});
