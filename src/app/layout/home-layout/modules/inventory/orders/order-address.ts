// Order address editing, shared by the order details page and the pack
// dialog. The backend enforces the same rules in
// controllers/admin/inventory/order/updateAddress.js.
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { CustomerAddressDialogComponent } from '../../customers/customer-details/customer-address-dialog.component';

export type OrderAddressKind = 'shipping' | 'billing';

/** Order-level rules only: callers also check order.address.manage (and Zoho sync where known). */
export function isOrderAddressEditable(order: any): boolean {
  return ['pending', 'confirmed', 'processing'].includes(order?.order_status) &&
    !order?.awb && !order?.shiprocket_order_id && !order?.inventory_reverted &&
    (!order?.refund?.status || order.refund.status === 'not_required');
}

/** One-line address for summaries. */
export function formatOrderAddress(address: any): string {
  return [address?.address_line_1, address?.address_line_2, address?.land_mark,
    address?.city_name || address?.city?.name, address?.state_name || address?.state?.name, address?.postcode]
    .filter(Boolean).join(', ');
}

/** Opens the editor for one of the order's addresses. Emits true once saved. */
export function openOrderAddressEditor(dialog: MatDialog, order: any, kind: OrderAddressKind): Observable<boolean> {
  const address = order[`${kind}_address`];
  return dialog.open(CustomerAddressDialogComponent, {
    width: '680px', maxWidth: '96vw', maxHeight: '92vh', disableClose: true,
    data: { orderId: order._id, orderNumber: order.id, addressKind: kind,
      expectedUpdatedAt: order.updated_at,
      address: { ...address,
        country: address.country?.id ?? address.country,
        state: address.state?.id ?? address.state,
        city_name: address.city_name || address.city?.name || '',
        address_type: kind, purpose: kind,
      },
      invoiceNumber: order.invoice?.generated ? order.invoice?.invoice_number || 'the invoice' : null,
      shipping: order.shipping || 0, grandTotal: order.grand_total, currency: order.currency || 'INR' },
  }).afterClosed();
}
