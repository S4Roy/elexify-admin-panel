import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';

@Component({
  selector: 'app-new-shipping-class',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatSelectModule,
    MatDialogModule,
    MatCheckboxModule,
    NgIf,
  ],
  templateUrl: './new-shipping-class.component.html',
  styleUrl: './new-shipping-class.component.scss',
})
export class NewShippingClassComponent {
  Global = Global;
  formGroup!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    private inventoryService: InventoryService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<NewShippingClassComponent>
  ) {
    this.formGroup = this.fb.group({
      name: [
        this.data?.name ?? null,
        Validators.compose([Validators.required]),
      ],
      description: [this.data?.description ?? null],
      is_default: [this.data?.is_default ?? false],
      status: [
        this.data?.status ?? 'active',
        Validators.compose([Validators.required]),
      ],
    });
  }

  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.formGroup.disable();
      let formData = this.formGroup.getRawValue();
      if (this.data?._id) {
        formData._id = this.data._id;
      } else {
        if (!formData?.description) {
          delete formData.description;
        }
      }

      this.inventoryService.submitShippingClass(formData).subscribe({
        next: (res: any) => {
          this.dialogRef.close(res);
          this.toastr.success(res?.message);
        },
        error: (err: any) => {
          this.formGroup.enable();
        },
      });
    }
  }
}
