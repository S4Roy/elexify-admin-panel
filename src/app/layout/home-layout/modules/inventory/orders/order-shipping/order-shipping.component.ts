import {
  CommonModule,
  CurrencyPipe,
  DatePipe,
  NgFor,
  NgIf,
} from '@angular/common';
import { Component, Inject, Optional } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute } from '@angular/router';
import { AmountNumberDirective } from 'app/core/directives/amount-number.directive';
import FilterOptions from 'app/core/models/FilterOptions';
import { InventoryService } from 'app/core/services/inventory.service';
import * as Global from 'app/global';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-order-shipping',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    DatePipe,
    NgFor,
    NgIf,
    CurrencyPipe,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AmountNumberDirective,
  ],
  templateUrl: './order-shipping.component.html',
  styleUrl: './order-shipping.component.scss',
})
export class OrderShippingComponent {
  Global = Global;
  filterOption: FilterOptions;
  error: any = null;
  loading: any = null;
  selected: any = null;
  showRaw: any = null;
  selecting: any = null;
  shipping_data: any = null;
  formGroup!: FormGroup;
  constructor(
    @Optional() public dialogRef: MatDialogRef<OrderShippingComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private route: ActivatedRoute,
    private inventoryService: InventoryService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filterOption = Global.resetTableFilterOptions();
    this.formGroup = this.fb.group({
      _id: [this.data?.item?._id, Validators.required],
      weight: [0.5, Validators.required],
      length: [10, Validators.required],
      width: [10, Validators.required],
      height: [10, Validators.required],
    });
  }
  ngOnInit() {
    this.filterOption._id = this.data?.item?._id;
    if (this.filterOption._id) {
      this.fetchOrderList();
    }
  }
  onConfirm(): void {
    this.dialogRef.close({ confirm: true });
  }

  onCancel(): void {
    this.dialogRef.close({ discard: true });
  }
  closeModal() {
    this.dialogRef.close(false);
  }
  toggleRaw() {}
  fetchOrderList() {
    let params = new URLSearchParams();
    params.set('_id', String(this.filterOption._id));
    this.inventoryService.orderList(params).subscribe({
      next: (res: any) => {
        this.data = res?.data;
      },
      error: (err) => {},
    });
  }
  shippingDetails() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.inventoryService
        .sendToShipRocket(this.formGroup.getRawValue())
        .subscribe({
          next: (res: any) => {
            this.toastr.success(res?.message);
            this.dialogRef.close(res);
          },
          error: (err) => {},
        });
    }
  }
  selectCourier(c: any) {}
}
