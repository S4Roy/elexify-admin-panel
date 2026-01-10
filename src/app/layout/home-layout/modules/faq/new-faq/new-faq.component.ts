import { NgFor, NgIf } from '@angular/common';
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
import { ActivatedRoute } from '@angular/router';
import { PageService } from 'app/core/services/page.service';
import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { MatSelectModule } from '@angular/material/select';
import { InventoryService } from 'app/core/services/inventory.service';
import FilterOptions from 'app/core/models/FilterOptions';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
@Component({
  selector: 'app-new-faq',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    NgFor,
    MatTooltipModule,
    MatSelectModule,
    MatDialogModule,
    NgIf,
    NgSelectModule,
  ],
  templateUrl: './new-faq.component.html',
  styleUrl: './new-faq.component.scss',
})
export class NewFaqComponent {
  Global = Global;
  formGroup!: FormGroup;
  faqCategories: any[] = Global.FAQ_CATEGORIES;
  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    private apiService: ApiService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<NewFaqComponent>
  ) {
    this.formGroup = this.fb.group({
      category: [
        this.data?.category ?? 'General',
        Validators.compose([Validators.required]),
      ],
      question: [
        this.data?.question ?? null,
        Validators.compose([Validators.required]),
      ],
      answer: [
        this.data?.answer ?? null,
        Validators.compose([Validators.required]),
      ],
      status: [
        this.data?.status ?? 'active',
        Validators.compose([Validators.required]),
      ],
    });
  }
  ngOnInit(): void {}

  onSubmit() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.valid) {
      this.formGroup.disable();
      let formData = this.formGroup.getRawValue();
      if (this.data?._id) {
        formData._id = this.data._id;
      }
      this.apiService.submitFaq(formData).subscribe({
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
