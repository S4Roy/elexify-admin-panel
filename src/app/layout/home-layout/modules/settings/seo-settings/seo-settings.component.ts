import { PermissionDirective } from 'app/core/directives/permission.directive';
import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';

const TEMPLATE_VARIABLES =
  '{productName} {categoryName} {subcategoryName} {brandName} {attribute} {price} {siteName}';

@Component({
  selector: 'app-seo-settings',
  imports: [PermissionDirective,
    ReactiveFormsModule,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './seo-settings.component.html',
  styleUrl: './seo-settings.component.scss',
})
export class SeoSettingsComponent {
  Global = Global;
  formGroup!: FormGroup;
  templateVariablesHint = TEMPLATE_VARIABLES;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private inventoryService: InventoryService
  ) {
    this.formGroup = this.fb.group({
      site_name: ['', [Validators.required]],
      product_title_template: ['', [Validators.required]],
      product_description_template: ['', [Validators.required]],
      title_min_length: [50, [Validators.required, Validators.min(1)]],
      title_max_length: [60, [Validators.required, Validators.min(1)]],
      description_min_length: [140, [Validators.required, Validators.min(1)]],
      description_max_length: [160, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.fetchSettings();
  }

  fetchSettings() {
    this.inventoryService.seoSettingsGet().subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (!data) return;
        this.formGroup.patchValue({
          site_name: data.site_name ?? '',
          product_title_template: data.product_title_template ?? '',
          product_description_template: data.product_description_template ?? '',
          title_min_length: data.title_min_length ?? 50,
          title_max_length: data.title_max_length ?? 60,
          description_min_length: data.description_min_length ?? 140,
          description_max_length: data.description_max_length ?? 160,
        });
      },
      error: () => {},
    });
  }

  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.formGroup.disable();
      const payload = this.formGroup.getRawValue();
      this.inventoryService.seoSettingsUpdate(payload).subscribe({
        next: (res: any) => {
          this.formGroup.enable();
          this.toastr.success(res?.message ?? 'SEO settings saved');
        },
        error: () => {
          this.formGroup.enable();
        },
      });
    }
  }
}
