import {
  NgFor,
  NgIf,
  NgSwitch,
  NgSwitchCase,
  NgSwitchDefault,
} from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  OnInit,
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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';

import * as Global from 'app/global';
import { InventoryService } from 'app/core/services/inventory.service';
import { MatDialog } from '@angular/material/dialog';
import { MediaComponent } from 'app/layout/home-layout/modules/settings/media/media.component';
import { ToastrService } from 'ngx-toastr';
import { AmountNumberDirective } from 'app/core/directives/amount-number.directive';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ApiService } from 'app/core/services/api.service';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Essentials,
  Paragraph,
  Heading,
  Link,
  BlockQuote,
  Code,
  CodeBlock,
  List,
} from 'ckeditor5';
@Component({
  selector: 'app-product-specifications',
  imports: [
    ReactiveFormsModule,
    NgSelectModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    NgFor,
    MatTooltipModule,
    MatButtonModule,
    MatExpansionModule,
    MatDividerModule,
    MatSelectModule,
    MatSliderModule,
    MatCheckboxModule,
    NgSwitch, // ✅ Added
    NgSwitchCase,
    NgSwitchDefault,
    CKEditorModule,
  ],
  templateUrl: './product-specifications.component.html',
  styleUrl: './product-specifications.component.scss',
})
export class ProductSpecificationsComponent {
  @Input() data!: any;
  @Input() formGroup!: FormGroup;
  @Output() specificationsChange = new EventEmitter<any>();
  public Editor = ClassicEditor;
  public config = {
    licenseKey: 'GPL', // Or 'GPL'.
    plugins: [Essentials, Paragraph, List],
    toolbar: ['bulletedList', 'numberedList'],
  };
  Global = Global;
  shipping_classes: any[] = [];
  attribute_values: any[] = [];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  get specifications(): FormArray {
    return this.formGroup.get('specifications') as FormArray;
  }
  newSpecification(item: any = null): FormGroup {
    return this.fb.group({
      specification_id: [item?._id ?? null, [Validators.required]],
      label: [item?.label ?? null, []],
      // options: [item?.o  ptions ?? null, []],
      type: [item?.type ?? null, []],
      key: [item?.key ?? null, []],
      value: [
        item?.value ?? null,
        [item?.required ? Validators.required : Validators.nullValidator],
      ],
    });
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.fetchSpecifications();
    }
  }

  emitChanges() {
    this.formGroup.markAllAsTouched();
    this.specificationsChange.emit(this.formGroup);
  }
  fetchSpecifications() {
    this.apiService
      .specificationList(new URLSearchParams({ status: 'active' }))
      .subscribe({
        next: (res: any) => {
          const specifications = this.data?.specifications ?? [];
          const item_list = res?.data?.docs ?? [];
          this.specifications.clear();
          item_list.forEach((item: any) => {
            const spec = specifications.find(
              (s: any) => s.specification?._id === item._id
            );
            if (spec) {
              item.value = spec.value;
            } else {
              item.value = null;
            }
            this.specifications.push(this.newSpecification(item));
          });
        },
        error: (err) => {},
      });
  }
}
