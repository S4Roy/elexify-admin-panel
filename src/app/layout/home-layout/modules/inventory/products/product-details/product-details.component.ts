import {
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
  NgClass,
  NgFor,
  NgIf,
  NgSwitch,
  NgSwitchCase,
  NgSwitchDefault,
} from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { InventoryService } from 'app/core/services/inventory.service';
import { PermissionService } from 'app/core/services/permission.service';
import { SpecialButtonComponent } from 'app/layout/home-layout/includes/special-button/special-button.component';
import { environment } from '../../../../../../../environments/environment';
import { StocksComponent } from '../stocks/stocks.component';

/**
 * Read-only product overview: gallery, description, variants and
 * specifications on the left; pricing, inventory, organization, shipping
 * and activity cards on the right. Editing still happens on the product
 * form and stock changes in the stock panel.
 */
@Component({
  selector: 'app-product-details',
  imports: [
    NgIf,
    NgFor,
    NgClass,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    DatePipe,
    CurrencyPipe,
    DecimalPipe,
    RouterLink,
    MatIconModule,
    MatTooltipModule,
    SpecialButtonComponent,
  ],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss',
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  product: any;
  activeImage = 0;
  // Store-wide low-stock level; a SKU's own threshold wins.
  siteThreshold = 5;
  readonly stockLabels: Record<string, string> = {
    in_stock: 'In stock',
    low_stock: 'Low stock',
    out_of_stock: 'Out of stock',
    on_backorder: 'Backorder',
    untracked: 'Not tracked',
  };
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private title: Title,
    private meta: Meta,
    private dialog: MatDialog,
    private inventoryService: InventoryService,
    private access: PermissionService
  ) {}

  ngOnInit(): void {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.setProduct(data['product']);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setProduct(product: any) {
    // The resolver falls back to the string 'Product' when the fetch fails.
    this.product = product && typeof product === 'object' ? product : null;
    this.activeImage = 0;
    if (!this.product) return;
    this.title.setTitle(this.product.seo?.meta_title || this.product.name);
    this.fetchThreshold();
    this.meta.updateTag({
      name: 'description',
      content: this.product.seo?.meta_description || '',
    });
  }

  get canEdit(): boolean {
    return this.access.actions('products').includes('edit');
  }
  get canViewStock(): boolean {
    return this.access.can('inventory.view');
  }

  get storefrontUrl(): string | null {
    const base = environment.STOREFRONT_URL;
    return base && this.product?.slug ? `${base.replace(/\/$/, '')}/product/${this.product.slug}` : null;
  }

  get isVariable(): boolean {
    return this.product?.type === 'variable';
  }

  get images(): any[] {
    return (this.product?.images ?? []).filter((img: any) => img?.url);
  }

  get mainImage(): any {
    return this.images[this.activeImage] ?? this.images[0] ?? null;
  }

  // Variations are raw docs here, simple products carry their own figures.
  private skus(): any[] {
    return this.isVariable ? this.product?.variations ?? [] : [this.product];
  }

  stockOf(sku: any) {
    if (!sku || sku.manage_stock === false) {
      return { tracked: false, onHand: 0, reserved: 0, available: 0, status: 'untracked' };
    }
    const onHand = Number(sku.stock_quantity ?? 0);
    const reserved = Number(sku.reserved_quantity ?? 0);
    const available = onHand - reserved;
    let status = 'in_stock';
    if (available <= 0) status = sku.allow_backorders ? 'on_backorder' : 'out_of_stock';
    else if (available <= Number(sku.low_stock_threshold ?? this.siteThreshold)) status = 'low_stock';
    return { tracked: true, onHand, reserved, available: Math.max(0, available), status };
  }

  // Totals across every SKU of the product.
  get stockSummary() {
    const states = this.skus().map((sku) => this.stockOf(sku));
    const tracked = states.filter((s) => s.tracked);
    const out = tracked.filter((s) => s.status === 'out_of_stock').length;
    let status = 'untracked';
    if (tracked.length) {
      status = out === tracked.length ? 'out_of_stock'
        : out || tracked.some((s) => s.status === 'low_stock') ? 'low_stock'
        : tracked.every((s) => s.status === 'on_backorder') ? 'on_backorder'
        : 'in_stock';
    }
    const sum = (key: 'onHand' | 'reserved' | 'available') => tracked.reduce((n, s) => n + s[key], 0);
    return { status, tracked: tracked.length > 0, onHand: sum('onHand'), reserved: sum('reserved'), available: sum('available'), outCount: out, skuCount: states.length };
  }

  isOnSale(sku: any): boolean {
    return Number(sku?.sale_price) > 0 && Number(sku.sale_price) < Number(sku?.regular_price);
  }

  sellingPrice(sku: any): number | null {
    const price = this.isOnSale(sku) ? Number(sku.sale_price) : Number(sku?.regular_price);
    return Number.isFinite(price) && price > 0 ? price : null;
  }

  discountOf(sku: any): number {
    return this.isOnSale(sku) ? Math.round((1 - Number(sku.sale_price) / Number(sku.regular_price)) * 100) : 0;
  }

  get priceRange(): { min: number; max: number } | null {
    const prices = this.skus().map((sku) => this.sellingPrice(sku)).filter((p): p is number => p !== null);
    return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
  }

  attrValue(attr: any): string {
    return attr?.value?.name ?? attr?.value?.value ?? '';
  }

  get hasDimensions(): boolean {
    const d = this.product?.dimensions;
    return !!(d?.length || d?.width || d?.height);
  }

  get hsnMissing(): boolean {
    if (this.product?.hsn_sac) return false;
    return !this.isVariable || !(this.product?.variations?.length) || this.product.variations.some((v: any) => !v?.hsn_sac);
  }

  private fetchThreshold() {
    if (!this.canViewStock || !this.product?._id) return;
    this.inventoryService.stockLevels(new URLSearchParams({ product: this.product._id, limit: '1' })).subscribe({
      next: (res: any) => (this.siteThreshold = Number(res?.data?.low_stock_threshold ?? this.siteThreshold)),
      error: () => {},
    });
  }

  openStock() {
    this.dialog
      .open(StocksComponent, { data: this.product, disableClose: true })
      .afterClosed()
      .subscribe((changed: any) => {
        if (changed) this.reload();
      });
  }

  private reload() {
    this.inventoryService.productBySlug(this.product.slug).subscribe({
      next: (res: any) => {
        const index = this.activeImage;
        this.setProduct(res?.data);
        this.activeImage = index;
      },
      error: () => {},
    });
  }

  trackById(index: number, row: any) {
    return row?._id ?? index;
  }
}
