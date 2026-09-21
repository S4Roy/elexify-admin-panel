import { Observable } from 'rxjs';

export type FilterFieldType =
  | 'multiselect'
  | 'select'
  | 'daterange'
  | 'number-range'
  | 'async-select'
  | 'text';

export interface FilterFieldOption {
  value: string;
  label: string;
  color?: string;
}

export interface FilterFieldDef {
  key: string;
  label: string;
  type: FilterFieldType;
  options?: FilterFieldOption[];
  placeholder?: string;
  showCheckboxes?: boolean;
  // number-range / daterange store their two values under separate keys
  fromKey?: string;
  toKey?: string;
  // async-select: called with the typed search term, resolves to options
  searchFn?: (term: string) => Observable<FilterFieldOption[]>;
}
