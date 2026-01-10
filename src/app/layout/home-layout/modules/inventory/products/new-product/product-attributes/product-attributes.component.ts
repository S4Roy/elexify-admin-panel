import { JsonPipe, NgFor, NgIf } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormArray,
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
import { NgSelectModule } from '@ng-select/ng-select';
import FilterOptions from 'app/core/models/FilterOptions';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { InventoryService } from 'app/core/services/inventory.service';
import * as Global from 'app/global';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-product-attributes',
  imports: [
    ReactiveFormsModule,
    NgSelectModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    NgFor,
    MatTooltipModule,
    NgIf,
    MatButtonModule,
    MatExpansionModule,
    MatDividerModule,
  ],
  templateUrl: './product-attributes.component.html',
  styleUrl: './product-attributes.component.scss',
})
export class ProductAttributesComponent {
  Global = Global;

  @Input() data!: any;
  @Input() formGroup!: FormGroup;
  @Output() attributesChange = new EventEmitter<any>();

  attributes_list: any[] = [];
  filter_attributes: any[] = [];
  values: { [key: string]: any[] } = {};
  pagination: PaginationOptions = Global.resetPaginationOptions();
  filter: FilterOptions = Global.resetTableFilterOptions();
  attributeFormGroup: FormGroup;
  attributesSearchSubject = new Subject<any>();

  constructor(
    private inventoryService: InventoryService,
    private fb: FormBuilder
  ) {
    this.attributeFormGroup = this.fb.group({
      attribute: [null],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['formGroup'] &&
      this.formGroup &&
      !this.formGroup.get('attributes')
    ) {
      this.formGroup.addControl('attributes', new FormArray([]));
    }
    if (this.data?.attributes?.length && this.attributes.length === 0) {
      this.data.attributes.forEach((attr: any) => {
        this.attributes.push(
          this.fb.group({
            attribute: [attr?.attribute_id ?? null, Validators.required],
            attribute_name: [attr?.name ?? ''],
            visible_in_list: [attr?.visible_in_list ?? false],
            attribute_description: [attr?.description ?? ''],
            values: [attr?.values, Validators.required],
          })
        );
        this.values[attr._id] = attr.values || [];
      });
    }
    if (this.data?._id) {
      // this.attributes.disable();
      // this.attributeFormGroup.disable();
    }
  }

  ngOnInit(): void {
    this.attributesSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((data: any) => {
        this.attributes_list = [];
        this.pagination = Global.resetPaginationOptions();
        this.filter = Global.resetTableFilterOptions();
        this.filter.search_key = data?.term ?? '';
        this.fetchAttributeList();
      });

    this.fetchAttributeList();
  }

  get attributes(): FormArray {
    return this.formGroup.get('attributes') as FormArray;
  }

  newAttribute(value: any): FormGroup {
    return this.fb.group({
      attribute: [value?._id ?? null, Validators.required],
      attribute_name: [value?.name ?? ''],
      attribute_description: [value?.description ?? ''],
      visible_in_list: [value?.visible_in_list ?? false],
      values: [
        value?.values?.map((v: any) => v._id) ?? [],
        Validators.required,
      ],
    });
  }

  fetchAttributeList() {
    const params = new URLSearchParams();
    if (this.pagination.page) params.set('page', String(this.pagination.page));
    if (this.filter.search_key)
      params.set('search_key', this.filter.search_key);

    this.inventoryService.attributeList(params).subscribe({
      next: (res: any) => {
        const docs = res?.data?.docs ?? [];
        this.attributes_list = [...this.attributes_list, ...docs];
        this.filter_attributes = this.attributes_list.filter(
          (attr) =>
            !this.attributes.controls.some(
              (ctrl) => ctrl.get('attribute')?.value === attr._id
            )
        );
        docs.forEach((attr: any) => {
          this.values[attr._id] = attr?.values || [];
        });
        this.pagination = { ...res?.data };
      },
    });
  }

  loadMoreAttributes() {
    if (this.pagination.hasNextPage) {
      this.pagination.page = this.pagination.nextPage;
      this.fetchAttributeList();
    }
  }

  onAttributeSelect(value: any) {
    if (value && value._id) {
      const exists = this.attributes.controls.some(
        (ctrl) => ctrl.get('attribute')?.value === value._id
      );
      if (!exists) {
        this.attributes.push(this.newAttribute(value));
        this.values[value._id] = value.values || [];
        this.filter_attributes = this.attributes_list.filter(
          (attr) =>
            !this.attributes.controls.some(
              (ctrl) => ctrl.get('attribute')?.value === attr._id
            )
        );
        this.attributeFormGroup.patchValue({ attribute: null });
      }
      this.emitChanges();
    }
  }

  removeAttribute(index: number) {
    const control = this.attributes.at(index);
    const id = control.get('attribute')?.value;
    if (id) {
      const existingAttr = this.attributes_list.find((a) => a._id === id);
      if (existingAttr) this.filter_attributes.push(existingAttr);
    }
    this.attributes.removeAt(index);
    this.emitChanges();
  }

  selectAllValues(index: number) {
    const control = this.attributes.at(index);
    const attrId = control.get('attribute')?.value;
    const allValues = this.values[attrId] || [];
    const currentSelected = control.get('values')?.value || [];

    if (allValues.length === currentSelected.length) {
      this.deselectAllValues(index);
    } else {
      control.patchValue({ values: allValues.map((v: any) => v._id) });
      this.emitChanges();
    }
  }

  deselectAllValues(index: number) {
    const control = this.attributes.at(index);
    control.patchValue({ values: [] });
    this.emitChanges();
  }

  isAllSelected(index: number): boolean {
    const control = this.attributes.at(index);
    const attrId = control.get('attribute')?.value;
    const selected = control.get('values')?.value || [];
    const all = this.values[attrId] || [];
    return selected.length === all.length && all.length > 0;
  }

  emitChanges() {
    this.formGroup.markAllAsTouched();
    this.attributesChange.emit(this.formGroup);
  }
}
