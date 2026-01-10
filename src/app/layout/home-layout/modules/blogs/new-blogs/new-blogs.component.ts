import { NgFor, NgIf } from '@angular/common';
import { Component, Inject, Optional, ViewEncapsulation } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import * as Global from 'app/global';
import { MatSelectModule } from '@angular/material/select';
import { InventoryService } from 'app/core/services/inventory.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { MatButtonModule } from '@angular/material/button';
import { MediaComponent } from '../../settings/media/media.component';
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
  TodoList,
  Indent,
  Alignment,
  Font,
  Highlight,
  HorizontalLine,
  Table,
  TableToolbar,
  MediaEmbed,
  Image,
  ImageToolbar,
  ImageUpload,
  SpecialCharacters,
  RemoveFormat,
  ImageResize,
} from 'ckeditor5';
import { ApiService } from 'app/core/services/api.service';
import FilterOptions from 'app/core/models/FilterOptions';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
// inside NewBlogsComponent class (add near other methods)

class UploadAdapter {
  loader: any;
  inventoryService: InventoryService;
  constructor(loader: any, inventoryService: InventoryService) {
    this.loader = loader;
    this.inventoryService = inventoryService;
  }

  // Starts the upload process.
  upload() {
    return this.loader.file.then((file: File) => {
      return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
          reject('Only image uploads are allowed.');
          return;
        }
        this.inventoryService
          .submitMedia({ file: file, ref_type: 'blogs' })
          .subscribe({
            next: (res: any) => {
              // the editor expects { default: 'imageUrl' }
              // adjust `res` path according to your API response
              resolve({ default: res?.data?.url ?? res?.url });
            },
            error: (err) => reject(err),
          });
      });
    });
  }

  abort() {
    // optional: implement abort if your ApiService supports cancelling
  }
}

@Component({
  selector: 'app-new-blogs',
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
    MatButtonModule,
    CKEditorModule,
    NgSelectModule,
  ],
  templateUrl: './new-blogs.component.html',
  styleUrl: './new-blogs.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class NewBlogsComponent {
  tag_list: any = [];
  blog_list: any = [];
  Global = Global;
  formGroup!: FormGroup;
  public Editor = ClassicEditor;
  public config = {
    licenseKey: 'GPL', // Or 'GPL'.
    plugins: [
      Essentials,
      Paragraph,
      Heading,
      Bold,
      Italic,
      Underline,
      Strikethrough,
      Link,
      BlockQuote,
      List,
      Alignment,
      TodoList,
      Table,
      TableToolbar,
      MediaEmbed,
      Image,
      ImageToolbar,
      ImageUpload,
      Highlight,
      RemoveFormat,
      ImageResize, // <-- added
    ],
    toolbar: [
      'undo',
      'redo',
      '|',
      'heading',
      '|',
      'bold',
      'italic',
      'underline',
      'strikethrough',
      '|',
      'link',
      'blockQuote',
      'alignment',
      '|',
      'bulletedList',
      'numberedList',
      'todoList',
      '|',
      'insertTable',
      'mediaEmbed',
      'imageUpload',
      'insertMedia',
      '|',
      'highlight',
      'removeFormat',
    ],
    image: {
      toolbar: [
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side',
        '|',
        'resizeImage', // <-- add resize control
        '|',
        'imageTextAlternative',
      ],
      resizeOptions: [
        {
          name: 'resizeImage:original',
          value: null,
          label: 'Original',
        },
        {
          name: 'resizeImage:25',
          value: '25',
          label: '25%',
        },
        {
          name: 'resizeImage:50',
          value: '50',
          label: '50%',
        },
        {
          name: 'resizeImage:75',
          value: '75',
          label: '75%',
        },
      ],
    },
    toolbarShouldNotGroupWhenFull: true,
  };
  // editor!: Editor;
  // shortEditor!: Editor;
  blog_id: any = null;
  blogSearchSubject = new Subject<any>();
  blogPagination: PaginationOptions;
  blogFilter: FilterOptions;
  constructor(
    private fb: FormBuilder,
    public toastr: ToastrService,
    private route: ActivatedRoute,
    private apiService: ApiService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any = {},
    private dialog: MatDialog,
    private router: Router,
    private inventoryService: InventoryService
  ) {
    this.blogPagination = Global.resetPaginationOptions();
    this.blogFilter = Global.resetTableFilterOptions();

    this.initFormGroup();
  }

  initFormGroup() {
    this.formGroup = this.fb.group({
      title: [this.data?.title ?? '', [Validators.required]],
      short_description: [
        this.data?.short_description ?? '',
        [Validators.required],
      ],
      content: [this.data?.content ?? '', [Validators.required]],
      tags: [null, []],
      related_blogs: [null, []],
      images: this.fb.array([]),
    });
    if (this.data?.feature_image) {
      this.images.clear();
      this.images.push(this.fb.group(this.data.feature_image));
    }
    if (this.data?.tags?.length) {
      this.formGroup.patchValue({ tags: this.data.tags });
      this.tag_list = this.data.tags; // ✅ important
    }
    if (this.data?.related_blogs?.length) {
      let related_blogIds = this.data.related_blogs.map(
        (blog: any) => blog._id
      );
      this.formGroup.patchValue({ related_blogs: related_blogIds });
      this.blog_list = this.data.related_blogs; // ✅ important
    } else {
      this.fetchBlogList();
    }
  }
  ngOnInit(): void {
    this.route.params.subscribe((params: any) => {
      this.blog_id = params?._id;
      if (this.blog_id) {
        this.fetchBlogDetails();
      }
    });
    this.blogSearchSubject
      .pipe(
        debounceTime(300), // Adjust debounce time as needed
        distinctUntilChanged()
      )
      .subscribe((data: any) => {
        this.blog_list = [];
        this.blogPagination = Global.resetPaginationOptions();
        this.blogFilter = Global.resetTableFilterOptions();
        this.blogFilter.search_key = data?.term ?? '';
        this.fetchBlogList();
      });
  }
  get images(): FormArray {
    return this.formGroup.get('images') as FormArray;
  }

  chooseFile() {
    this.dialog
      .open(MediaComponent, {
        disableClose: true,
        width: '80%',
        height: '80%',
        data: {
          ref_type: 'blogs',
          multiple: false,
          selectedFiles: this.images.value,
        },
      })
      .afterClosed()
      .subscribe((res: any) => {
        if (res) {
          this.images.clear();
          res.forEach((file: any) => {
            this.images.push(this.fb.group(file));
          });
        }
      });
  }
  removeImage(index: number) {
    this.images?.removeAt(index);
    this.images.updateValueAndValidity(); // if using FormArray
  }
  fetchBlogList() {
    let params = new URLSearchParams();
    if (this.blogPagination.page) {
      params.set('page', String(this.blogPagination.page));
    }
    if (this.blogFilter.search_key) {
      params.set('search_key', this.blogFilter.search_key);
    }
    this.apiService.blogList(params).subscribe({
      next: (res: any) => {
        this.blog_list = [...this.blog_list, ...res?.data?.docs];
        this.blogPagination = {
          ...res?.data,
        };
      },
      error: (err) => {},
    });
  }
  loadMoreBlogs() {
    if (this.blogPagination.hasNextPage) {
      this.blogPagination.page = this.blogPagination.nextPage;
      this.fetchBlogList();
    }
  }
  onSubmit() {
    this.formGroup.markAllAsTouched();
    Global.scrollToQuery('.is-invalid');
    if (this.formGroup.valid) {
      const rawValue = this.formGroup.getRawValue();
      // this.formGroup.disable();
      if (!rawValue.tags) {
        rawValue.tags = [];
      }
      if (!rawValue.related_blogs) {
        rawValue.related_blogs = [];
      }

      if (this.data?._id) {
        rawValue._id = this.data._id;
      }
      if (this.images?.getRawValue()?.length) {
        rawValue.feature_image = this.images?.getRawValue()[0]?._id;
      }
      delete rawValue.images;
      // if (Array.isArray(rawValue.meta_keywords)) {
      //   rawValue.meta_keywords = rawValue.meta_keywords.join(',');
      // }
      const isAdd = !this.data?._id;
      this.apiService.submiBlog(rawValue).subscribe({
        next: (res: any) => {
          // this.formGroup.enable();
          this.router.navigateByUrl('/blogs');
          this.toastr.success(res?.message);
        },
        error: () => {
          // this.formGroup.enable();
        },
      });
    }
  }
  fetchBlogDetails() {
    let params = new URLSearchParams();
    params.set('_id', this.blog_id);
    this.apiService.blogList(params).subscribe({
      next: (res: any) => {
        this.data = res?.data;
        this.initFormGroup();
      },
      error: (err) => {},
    });
  }
  onEditorReady(editorInstance: any) {
    const that = this;

    // Upload adapter
    editorInstance.plugins.get('FileRepository').createUploadAdapter = (
      loader: any
    ) => {
      return new UploadAdapter(loader, this.inventoryService);
    };

    // media picker button
    try {
      const ButtonView = (window as any).CKEDITOR5.ui.button.ButtonView;
      editorInstance.ui.componentFactory.add('insertMedia', (locale: any) => {
        const view = new ButtonView(locale);
        view.set({ label: 'Media', tooltip: true });
        view.on('execute', () => {
          const ref = that.dialog.open(MediaComponent, {
            width: '80%',
            height: '80%',
            data: { ref_type: 'blogs', multiple: false },
          });
          ref.afterClosed().subscribe((res: any) => {
            if (!res || !res.length) return;
            const img = res[0];
            const url = img.url || img.full_url || img.path;
            editorInstance.model.change((writer: any) => {
              const imageElement = writer.createElement('image', { src: url });
              editorInstance.model.insertContent(
                imageElement,
                editorInstance.model.document.selection
              );
            });
          });
        });
        return view;
      });
    } catch (e) {
      console.warn('Could not register insertMedia button', e);
    }
  }
}
