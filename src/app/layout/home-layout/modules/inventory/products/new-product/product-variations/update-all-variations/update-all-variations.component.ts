import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-update-all-variations',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './update-all-variations.component.html',
  styleUrl: './update-all-variations.component.scss',
})
export class UpdateAllVariationsComponent {
  formGroup!: FormGroup;
  constructor(
    private dialogRef: MatDialogRef<UpdateAllVariationsComponent>,
    private fb: FormBuilder
  ) {
    this.formGroup = this.fb.group({
      regular_price: ['', [Validators.min(0)]],
      sale_price: ['', [Validators.min(0)]],
      sku: [''],
      stock_quantity: ['', [Validators.required, Validators.min(0)]],
      weight: [''],
    });
  }
  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.dialogRef.close(this.formGroup.value);
    }
  }
  closeModal() {
    this.dialogRef.close();
  }
}
