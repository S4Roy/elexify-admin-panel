import { NgFor, NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
  FormArray,
} from '@angular/forms';
import {
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialog,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import FilterOptions from 'app/core/models/FilterOptions';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { InventoryService } from 'app/core/services/inventory.service';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatRadioModule } from '@angular/material/radio';
import * as Global from 'app/global';
import { MatButtonModule } from '@angular/material/button';
import { MediaComponent } from '../../../settings/media/media.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  CdkDropList,
  CdkDrag,
  moveItemInArray,
  CdkDragDrop,
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-new-attribute',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    NgFor,
    MatTooltipModule,
    MatSelectModule,
    MatDialogModule,
    NgIf,
    NgSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    CdkDropList,
    CdkDrag,
  ],
  templateUrl: './new-attribute.component.html',
  styleUrl: './new-attribute.component.scss',
})
export class NewAttributeComponent {
  Global = Global;
  formGroup!: FormGroup;
  item_list: any = [];
  paginationOption: PaginationOptions;
  filterOption: FilterOptions;
  searchSubject = new Subject<any>();
  priceTypeOptions = [
    { value: 'fixed', label: 'Fixed (absolute)' },
    { value: 'percent', label: 'Percent of base price' },
  ];

  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    private route: ActivatedRoute,
    private inventoryService: InventoryService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<NewAttributeComponent>,
    private dialog: MatDialog
  ) {
    this.paginationOption = Global.resetPaginationOptions();
    this.filterOption = Global.resetTableFilterOptions();
    this.formGroup = this.fb.group({
      name: [this.data?.name ?? null, [Validators.required]],
      visible_in_list: [this.data?.visible_in_list ?? false],
      size_meta: [this.data?.size_meta ?? false],
      customized_mala_mukhi: [this.data?.customized_mala_mukhi ?? false],
      customized_mala_design: [this.data?.customized_mala_design ?? false],
      customized_mala_type: [this.data?.customized_mala_type ?? false],
      description: [this.data?.description ?? null],
      status: [this.data?.status ?? 'active', [Validators.required]],
      display_type: [this.data?.display_type, [Validators.required]],
      values: this.fb.array([this.newValue()]), // For attribute values
    });
    if (data?.values && data.values.length > 0) {
      // If values are provided, populate the form array
      this.values.clear(); // Clear existing values
      // Loop through the provided values and add them to the form array
      data.values.forEach((value: any) => {
        this.values.push(this.newValue(value));
      });
    }
  }

  ngOnInit(): void {}
  // Getter for easy access
  get values(): FormArray {
    return this.formGroup.get('values') as FormArray;
  }
  // Add new value field
  addValue(): void {
    this.values.push(this.newValue());
  }
  newValue(value: any = null): FormGroup {
    let form: any = {
      name: [value?.name ?? '', Validators.required],
      description: [value?.description ?? ''],
      visible_in_list: [value?.visible_in_list ?? false],
      image: [value?.image?._id ?? ''],
      url: [value?.image?.url ?? ''],
      status: [value?.status ?? 'active'],
      // ---------- NEW FIELDS ----------
      price_modifier: [value?.price_modifier ?? 0, [Validators.min(0)]], // number >= 0
      price_type: [value?.price_type ?? 'fixed', [Validators.required]],
      // sku: [value?.sku ?? null],
      // min_qty: [value?.min_qty ?? null, [Validators.min(1)]],
      // max_qty: [value?.max_qty ?? null, [Validators.min(1)]],
      meta: this.fb.group({
        regular: [value?.meta?.regular ?? 0],
        medium: [value?.meta?.medium ?? 0],
        collector: [value?.meta?.collector ?? 0],
      }),
    };
    if (value?._id) {
      form._id = [value._id];
    }
    return this.fb.group(form);
  }
  // Remove value field
  removeValue(index: number): void {
    if (this.values.length === 1) {
      this.values.at(0).reset({
        name: '',
        description: '',
        visible_in_list: false,
        image: '',
        url: '',
        status: 'active',
        sort_order: 0,
        price_modifier: 0,
        price_type: 'fixed',
        // sku: null,
        // min_qty: null,
        // max_qty: null,
      });
      return;
    }
    this.values.removeAt(index);
  }

  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.formGroup.disable();
      let formData = this.formGroup.getRawValue();
      if (this.data?._id) {
        formData._id = this.data._id;
      }
      delete formData.file_preview;
      if (!formData?.image) {
        delete formData.image;
      }
      // cleanup empty images
      formData.values = (formData.values || []).map((v: any) => {
        // remove empty url prop if not used
        if (!v.image) delete v.url;
        // convert empty strings to nulls for optional numeric fields
        if (v.min_qty === '') v.min_qty = null;
        if (v.max_qty === '') v.max_qty = null;
        // ensure price_modifier is number
        v.price_modifier = Number(v.price_modifier || 0);
        return v;
      });
      this.inventoryService.submitAttribute(formData).subscribe({
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
  chooseFile(index: number) {
    this.dialog
      .open(MediaComponent, {
        disableClose: true,
        width: '80%',
        height: '80%',
        data: {
          ref_type: 'attributes',
          multiple: false,
          selectedFiles: [{ _id: this.values.at(index).value.image }],
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          res.forEach((file: any) => {
            // this.getImages(index).push(this.fb.group(file));
            const formGroup = this.values.at(index);
            formGroup.patchValue({
              image: file?._id,
              url: file?.url,
            });
          });
        }
      });
  }
  removeImage(index: number) {
    const formGroup = this.values.at(index);
    formGroup.patchValue({
      image: null,
      url: null,
    });
  }
  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(
      this.values.controls,
      event.previousIndex,
      event.currentIndex
    );
  }
}
