import { PermissionDirective } from 'app/core/directives/permission.directive';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Editor, NgxEditorModule } from 'ngx-editor';
import * as Global from 'app/global';
import { MatButtonModule } from '@angular/material/button';
import { NgClass, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from 'app/core/services/api.service';
import { ToastrService } from 'ngx-toastr';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-static-page',
  imports: [PermissionDirective,
    MatFormFieldModule,
    NgxEditorModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    NgIf,
    NgClass,
    MatInputModule,
  ],
  templateUrl: './static-page.component.html',
  styleUrl: './static-page.component.scss',
})
export class StaticPageComponent {
  Global = Global;
  shortEditor!: Editor;
  formGroup!: FormGroup;
  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private title: Title,
    private meta: Meta,
    private router: Router
  ) {
    this.shortEditor = new Editor();

    this.formGroup = this.fb.group({
      content: ['', Validators.required],
      title: ['', Validators.required],
      slug: ['', Validators.required],
    });
    this.route.params.subscribe((params: any) => {
      this.formGroup.patchValue({
        slug: params?.slug || this.route.snapshot.routeConfig?.path,
        title: params?.slug || this.route.snapshot.routeConfig?.path,
        content: '',
      });
    });
  }
  ngOnInit(): void {
    this.route.data.subscribe((data: any) => {
      this.formGroup.patchValue(data?.page);
     
    });
  }
  onSubmit() {
    this.formGroup.markAllAsTouched();
    Global.scrollToQuery('.is-invalid');
    if (this.formGroup.valid) {
      this.formGroup.disable();
      let formData = this.formGroup.getRawValue();
      this.apiService.submitPageContent(formData).subscribe({
        next: (res: any) => {
          this.formGroup.enable();
          this.toastr.success(res?.message);
          this.router.navigate([], {
            relativeTo: this.route,
            queryParamsHandling: 'preserve',
            skipLocationChange: false,
            replaceUrl: false,
            onSameUrlNavigation: 'reload',
          });
        },
        error: (err: any) => {
          this.formGroup.enable();
        },
      });
    }
  }
}
