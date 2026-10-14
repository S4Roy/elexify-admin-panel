import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'app/core/services/api.service';
import { DialogService } from 'app/core/services/dialog.service';
import { HelpersService } from 'app/core/services/helpers.service';
import * as Global from 'app/global';
import PaginationOptions from 'app/core/models/PaginationOptions';
import { PaginationComponent } from '../../../../includes/pagination/pagination.component';
import { EmptyStateComponent } from '../../../../includes/empty-state/empty-state.component';
import { SynonymDialogComponent, SynonymDialogData } from '../synonym-dialog/synonym-dialog.component';

@Component({
  selector: 'app-search-synonyms',
  imports: [NgIf, NgFor, MatIcon, RouterLink, PaginationComponent, EmptyStateComponent],
  templateUrl: './search-synonyms.component.html',
  styleUrl: '../search-insights.component.scss',
})
export class SearchSynonymsComponent implements OnInit, OnDestroy {
  itemList: any[] = [];
  paginationOption: PaginationOptions;
  loading = true;
  error = false;
  searchText = '';
  canEdit = false;
  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private dialogService: DialogService,
    private apiService: ApiService,
    private helperService: HelpersService,
    private toastr: ToastrService,
  ) {
    this.paginationOption = Global.resetPaginationOptions();
  }

  ngOnInit(): void {
    this.canEdit = this.helperService.can('operations.update');
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(text => {
        this.searchText = text;
        this.onPageChange(1);
      });
    this.fetchList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(value: string): void {
    this.search$.next(value.trim());
  }

  fetchList(): void {
    this.loading = true;
    this.error = false;
    const params = new URLSearchParams();
    if (this.searchText) params.set('q', this.searchText);
    if (this.paginationOption.limit) params.set('limit', String(this.paginationOption.limit));
    if (this.paginationOption.page) params.set('page', String(this.paginationOption.page));
    this.apiService.searchSynonyms(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.itemList = res?.data?.docs ?? [];
        this.paginationOption = { ...res?.data };
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  openEditor(item?: any): void {
    const data: SynonymDialogData = item ? { id: item._id, term: item.term, alternatives: item.alternatives } : { term: '' };
    this.dialog.open(SynonymDialogComponent, { width: '480px', maxWidth: '94vw', ariaLabelledBy: 'synonym-title', data }).afterClosed().subscribe(saved => {
      if (!saved) return;
      this.toastr.success(item ? 'Synonym updated' : 'Synonym added');
      this.fetchList();
    });
  }

  remove(item: any): void {
    this.dialogService.confirmDialog({
      title: 'Delete synonym',
      message: `Searches for "${item.term}" will no longer include ${item.alternatives.join(', ')}.`,
      cancelText: 'Cancel',
      saveText: 'Delete',
    }).subscribe((result: any) => {
      if (!result?.confirm) return;
      this.apiService.deleteSearchSynonym(item._id).subscribe({
        next: () => {
          this.toastr.success('Synonym deleted');
          if (this.itemList.length === 1 && this.paginationOption.page > 1) this.paginationOption.page--;
          this.fetchList();
        },
        error: (err: any) => this.toastr.error(err?.error?.message || 'Could not delete the synonym'),
      });
    });
  }

  onPageChange(page: number): void {
    this.paginationOption.page = page;
    this.fetchList();
  }
}
