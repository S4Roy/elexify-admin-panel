// Mirrors elexify-backend src/constants/stock.js (STOCK_ADJUSTMENT_REASONS
// and STOCK_REASON). Keep in sync.
export const STOCK_ADJUSTMENT_REASONS: { value: string; label: string; hint: string }[] = [
  { value: 'received', label: 'Stock received', hint: 'New units arrived from a supplier' },
  { value: 'count_correction', label: 'Count correction', hint: 'Physical count differs from the system' },
  { value: 'damage', label: 'Damaged', hint: 'Units broken or unsellable' },
  { value: 'loss', label: 'Lost', hint: 'Units missing' },
  { value: 'theft', label: 'Theft', hint: 'Units stolen' },
  { value: 'expired', label: 'Expired', hint: 'Units past their shelf life' },
  { value: 'internal_use', label: 'Internal use', hint: 'Used for demos, testing or samples' },
  { value: 'returned_to_vendor', label: 'Returned to supplier', hint: 'Sent back to the vendor' },
  { value: 'other', label: 'Other', hint: 'Explain in the note' },
];

const REASON_LABELS: Record<string, string> = {
  ...Object.fromEntries(STOCK_ADJUSTMENT_REASONS.map((r) => [r.value, r.label])),
  order_sale: 'Order',
  order_cancel: 'Order cancelled',
  customer_return: 'Customer return',
  rto_restock: 'Returned to origin',
  opening_balance: 'Opening balance',
};

const TYPE_LABELS: Record<string, string> = {
  sale: 'Order', restock: 'Restock', adjustment: 'Adjustment', opening_balance: 'Opening balance',
  in: 'Stock in', out: 'Stock out', return: 'Return',
};

export const movementLabel = (row: any): string =>
  REASON_LABELS[row?.reason] ?? TYPE_LABELS[row?.type] ?? row?.type ?? '—';

export const STOCK_STATUS_LABELS: Partial<Record<string, string>> = {
  in_stock: 'In stock',
  out_of_stock: 'Out of stock',
  on_backorder: 'On backorder',
};
