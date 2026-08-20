import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { FilterFieldDef } from 'app/core/models/FilterFieldDef';

export interface FilterDrawerData {
  fields: FilterFieldDef[];
  values: Record<string, any>;
}

@Component({
  selector: 'app-filter-drawer',
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule, NgSelectModule],
  templateUrl: './filter-drawer.component.html',
  styleUrl: './filter-drawer.component.scss',
})
export class FilterDrawerComponent implements OnInit {
  values: Record<string, any> = {};
  asyncOptions: Record<string, any[]> = {};
  asyncLoading: Record<string, boolean> = {};
  private typeaheadSubjects: Record<string, Subject<string>> = {};

  constructor(
    public dialogRef: MatDialogRef<FilterDrawerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FilterDrawerData
  ) {}

  ngOnInit(): void {
    this.values = { ...this.data.values };

    for (const field of this.data.fields) {
      if (field.type !== 'async-select') continue;
      // Preseed with the already-selected option (a full {value,label}
      // object, not just an id) so ng-select can render its label
      // immediately instead of showing blank until the next search.
      const current = this.values[field.key];
      this.asyncOptions[field.key] = current ? [current] : [];
      const subject = new Subject<string>();
      this.typeaheadSubjects[field.key] = subject;
      subject
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((term) => {
            if (!field.searchFn) return [];
            this.asyncLoading[field.key] = true;
            return field.searchFn(term);
          })
        )
        .subscribe((options) => {
          this.asyncOptions[field.key] = options || [];
          this.asyncLoading[field.key] = false;
        });
    }
  }

  typeaheadInput(key: string): Subject<string> {
    return this.typeaheadSubjects[key];
  }

  activeCount(): number {
    let count = 0;
    for (const field of this.data.fields) {
      if (field.type === 'daterange' || field.type === 'number-range') {
        if (this.values[field.fromKey!] || this.values[field.toKey!]) count++;
      } else if (Array.isArray(this.values[field.key])) {
        if (this.values[field.key].length) count++;
      } else if (this.values[field.key]) {
        count++;
      }
    }
    return count;
  }

  resetAll(): void {
    for (const field of this.data.fields) {
      if (field.type === 'daterange' || field.type === 'number-range') {
        this.values[field.fromKey!] = null;
        this.values[field.toKey!] = null;
      } else if (field.type === 'multiselect') {
        this.values[field.key] = [];
      } else {
        this.values[field.key] = null;
      }
    }
  }

  applyFilters(): void {
    this.dialogRef.close(this.values);
  }
}
