import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ApiService } from 'app/core/services/api.service';
import { HelpersService } from 'app/core/services/helpers.service';
import { EmptyStateComponent } from '../../../../includes/empty-state/empty-state.component';

@Component({
  selector: 'app-email-templates-list',
  imports: [NgFor, NgIf, DatePipe, EmptyStateComponent],
  templateUrl: './email-templates-list.component.html',
  styleUrl: './email-templates-list.component.scss',
})
export class EmailTemplatesListComponent implements OnInit, OnDestroy {
  templateList: any[] = [];
  loading = true;
  searchTerm = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private router: Router,
    private toastr: ToastrService,
    public helperService: HelpersService,
  ) {}

  get isPrivileged(): boolean {
    const role = this.helperService.role();
    return role === 'superadmin' || role === 'manager';
  }

  ngOnInit(): void {
    this.fetchTemplateList();
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.fetchTemplateList());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  fetchTemplateList() {
    this.loading = true;
    const params = new URLSearchParams();
    if (this.searchTerm) {
      params.set('search', this.searchTerm);
    }
    this.apiService.emailTemplateList(params).subscribe({
      next: (res: any) => {
        this.templateList = res?.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  editTemplate(action: string) {
    this.router.navigateByUrl(`/settings/email-templates/${action}`);
  }
}
