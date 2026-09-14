import { test, expect } from '@playwright/test';

test('admin review requires remarks and QC exposes only eligible actions', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ELEXIFY-TOKEN', 'ui-test-token');
    localStorage.setItem('ELEXIFY-USER', JSON.stringify({ _id: '507f1f77bcf86cd799439010', role: 'superadmin', name: 'Test Admin' }));
  });
  const request: any = { _id: '507f1f77bcf86cd799439011', order_id: '507f1f77bcf86cd799439012', request_number: 'RET-2026-0001', status: 'requested', return_type: 'replacement', reason: 'Defective item', customer_id: { name: 'Customer' }, items: [{ _id: '507f1f77bcf86cd799439013', product_name: 'Test product', quantity: 2 }], timeline: [] };
  let review: any;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/returns/review')) { review = route.request().postDataJSON(); request.status = review.action === 'approve' ? 'approved' : 'rejected'; }
    await route.fulfill({ json: { status: 'success', message: 'Updated', data: { docs: path.endsWith('/returns') ? [request] : [], totalPages: 1 } } });
  });
  await page.goto('/inventory/orders/returns');
  await expect(page.getByText('RET-2026-0001')).toBeVisible();
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(page.getByText('A rejection reason is required.')).toBeVisible();
  expect(review).toBeUndefined();
  await page.getByPlaceholder('Review note (required when rejecting)').fill('Approved for replacement');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generate / resume reverse pickup' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete inspection' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark refund completed' })).not.toBeVisible();
  expect(review.action).toBe('approve');
});
