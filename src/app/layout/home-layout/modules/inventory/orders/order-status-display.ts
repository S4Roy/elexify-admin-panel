// Shared order and payment badge definitions for the list and details pages.
// Amber: attention/incomplete; blue: preparation; teal: ready to ship; purple: in transit;
// green: fulfilled/paid; red: failure; gray: closed without fulfillment/payment.
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Failed',
  cancel_requested: 'Cancel Requested',
  cancelled: 'Cancelled',
  return_requested: 'Return Requested',
  returned: 'Returned',
  partially_shipped: 'Partially Shipped',
  partially_delivered: 'Partially Delivered',
};

export const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  packed: 'bg-teal-100 text-teal-800',
  shipped: 'bg-purple-100 text-purple-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancel_requested: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-gray-100 text-gray-700',
  return_requested: 'bg-amber-100 text-amber-800',
  returned: 'bg-gray-100 text-gray-700',
  partially_shipped: 'bg-purple-100 text-purple-800',
  partially_delivered: 'bg-purple-100 text-purple-800',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  advance_paid: 'Advance Paid',
  pending: 'Pending',
  failed: 'Failed',
  refund_pending: 'Refund Pending',
  partially_refunded: 'Partially Refunded',
  refunded: 'Refunded',
  refund_failed: 'Refund Failed',
};

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  advance_paid: 'bg-amber-100 text-amber-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
  refund_pending: 'bg-amber-100 text-amber-800',
  partially_refunded: 'bg-amber-100 text-amber-800',
  refunded: 'bg-gray-100 text-gray-700',
  refund_failed: 'bg-red-100 text-red-800',
};
