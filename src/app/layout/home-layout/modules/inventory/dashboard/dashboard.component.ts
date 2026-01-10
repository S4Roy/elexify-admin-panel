import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InventoryService } from 'app/core/services/inventory.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgClass, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'], // ✅ fixed spelling
})
export class DashboardComponent {
  recentOrders: any[] = [];
  data: any = { status: [], total: 0 };
  product: any = {
    total_products: 0,
    low_stock: 0,
    out_of_stock: 0,
    total_categories: 0,
  };

  constructor(private inventoryService: InventoryService) {}

  ngOnInit() {
    this.fetchOrderStats();
    this.fetchProductStats();
  }

  fetchOrderStats() {
    this.inventoryService
      .orderStats(new URLSearchParams())
      .subscribe((res: any) => {
        this.data.status = res?.data ?? [];
        this.data.total = this.data.status.reduce(
          (sum: number, item: any) => sum + (item?.count ?? 0),
          0
        );
      });
  }

  fetchProductStats() {
    this.inventoryService
      .productStats(new URLSearchParams())
      .subscribe((res: any) => {
        this.product = res?.data ?? this.product;
      });
  }
}
