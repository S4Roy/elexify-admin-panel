import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InventoryService } from 'app/core/services/inventory.service';

@Component({
  selector: 'app-dashboard',
  imports: [NgFor, RouterLink, NgIf, NgClass, CurrencyPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  recentOrders: any = [];
  data: any = {};
  product: any = {};
  isLoading: boolean = false;
  constructor(private inventoryService: InventoryService) {}
  ngOnInit() {
    this.fetchProductStats();
    this.fetchOrderStats();
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
