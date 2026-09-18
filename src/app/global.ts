'use strict';

import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
import { Editor, Toolbar } from 'ngx-editor';

import { environment } from '../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { ElementRef } from '@angular/core';
export const APP_NAME = environment.APP_NAME;
export const BACKEND_URL = environment.API_URL;
export const toolbar: Toolbar = [
  ['bold', 'italic'],
  ['underline'],
  // [, 'strike']
  // ['code', 'blockquote'],
  ['ordered_list', 'bullet_list'],
  [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
  // ['link', 'image'],
  ['text_color', 'background_color'],
  ['align_left', 'align_center', 'align_right', 'align_justify'],
];
export const FAQ_CATEGORIES = ['General'];
export function isInputValid(formGroup: FormGroup, control: any) {
  let valid: boolean = true;

  let cntrls = control.split('.');
  let fgroupcontrols: any = formGroup;
  if (cntrls.length > 1) {
    cntrls.forEach((c: any) => {
      fgroupcontrols = fgroupcontrols.controls[c];
    });
  } else {
    fgroupcontrols = fgroupcontrols.controls[control];
  }

  if (
    !['VALID', 'DISABLED'].includes(fgroupcontrols.status) &&
    (fgroupcontrols.touched || fgroupcontrols.dirty)
  ) {
    valid = false;
  }

  return valid;
}

export function isInputValidArray(
  formGroup: FormGroup,
  controlPath: string,
): boolean {
  let control: AbstractControl | null = formGroup;

  const pathParts = controlPath.split('.');

  for (const part of pathParts) {
    if (!control) break;

    if (control instanceof FormArray && !isNaN(+part)) {
      control = control.at(+part);
    } else if (control instanceof FormGroup) {
      control = control.get(part);
    } else {
      control = null;
    }
  }

  if (
    control &&
    !['VALID', 'DISABLED'].includes(control.status) &&
    (control.touched || control.dirty)
  ) {
    return false;
  }

  return true;
}

export function isInputRuleValid(
  formGroup: FormGroup,
  control: any,
  rule: any,
) {
  let valid: boolean = true;

  let cntrls = control.split('.');
  let fgroupcontrols: any = formGroup;
  if (cntrls.length > 1) {
    cntrls.forEach((c: any) => {
      fgroupcontrols = fgroupcontrols.controls[c];
    });
  } else {
    fgroupcontrols = fgroupcontrols.controls[control];
  }

  if (rule instanceof Array) {
    rule.forEach((r) => {
      if (
        fgroupcontrols.hasError(r) &&
        (fgroupcontrols.touched || fgroupcontrols.dirty)
      ) {
        valid = false;
      }
    });
  } else {
    if (
      fgroupcontrols.hasError(rule) &&
      (fgroupcontrols.touched || fgroupcontrols.dirty)
    ) {
      valid = false;
    }
  }

  return valid;
}

export function isInputRuleAvailable(
  formGroup: FormGroup,
  control: any,
  rule: any,
) {
  const formControl: any = formGroup.get(control);
  if (formControl) {
    const validator =
      formControl.validator && formControl.validator(new FormControl());
    if (validator && validator[rule]) {
      return true;
    }
  }

  return false;
}

export function onFileSelected(
  formGroup: FormGroup,
  event: any,
  sourceKey: any,
  toastr: ToastrService,
  allowedTypes: string[] = ['image/jpeg', 'image/png'], // Default allowed types are JPEG and PNG
  fileNameKey: any,
) {
  if (event.target.files.length > 0) {
    const files = event.target.files;
    const maxSize: number = 15000000; // Default max size is 5MB

    const file = event.target.files[0];
    if (file.size > maxSize) {
      toastr.error('File size exceeds the limit');
      return; // Skip this file and continue with the next one
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      const fileTypeName = file.type.split('/')[1];
      toastr.error(
        `${fileTypeName} type is not allowed. Allowed types are: ${allowedTypes.join(
          ', ',
        )}`,
      );
      return; // Skip this file and continue with the next one
    }
    var reader = new FileReader();

    reader.onloadend = function () {
      // Append the Base64 string to the array in the form group
      formGroup.patchValue({
        [sourceKey]: file,
        [fileNameKey]: file.name,
      });
    };

    reader.readAsDataURL(file);
  } else {
    formGroup.patchValue({
      [sourceKey]: null,
      [fileNameKey]: null,
    });
  }
}
export async function onFileSelectedMultiple(
  formGroup: FormGroup,
  event: any,
  sourceKey: any,
  toastr: ToastrService,
  allowedTypes: string[] = ['image/jpeg', 'image/png'], // Default allowed types are JPEG and PNG
  files_preview: any,
) {
  if (event.target.files.length > 0) {
    const files = event.target.files;
    const maxSize: number = 15000000; // Default max size is 5MB

    // Initialize the array in the form group if it doesn't exist
    if (!formGroup.get(sourceKey)) {
      formGroup.setControl(sourceKey, new FormControl([]));
    }
    if (!formGroup.get(files_preview)) {
      formGroup.setControl(files_preview, new FormControl([]));
    }

    const fileArrayControl = formGroup.get(sourceKey) as FormArray;
    const filePreviewArrayControl = formGroup.get(files_preview) as FormArray;
    fileArrayControl.clear();
    filePreviewArrayControl.clear();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size
      if (file.size > maxSize) {
        toastr.error('File size exceeds the limit');
        continue; // Skip this file and continue with the next one
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        toastr.error('File type is not allowed');
        continue; // Skip this file and continue with the next one
      }

      try {
        const base64String = await readFileAsDataURL(file);
        fileArrayControl.push(new FormControl(file));
        filePreviewArrayControl.push(new FormControl({ url: base64String }));
      } catch (error) {
        toastr.error('Error reading file');
      }
    }
  } else {
    formGroup.patchValue({
      [sourceKey]: null,
    });
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

export function humanize(str: string) {
  var i,
    frags = str.split('_');
  for (i = 0; i < frags.length; i++) {
    frags[i] = frags[i].charAt(0).toUpperCase() + frags[i].slice(1);
  }
  return frags.join(' ');
}
export function resetPaginationOptions() {
  return {
    limit: 50,
    page: 1,
    total_pages: 0,
    total_records: 0,
    hasNextPage: true,
    hasPrevPage: false,
    nextPage: 0,
    pagingCounter: 0,
    prevPage: 0,
    totalDocs: 0,
    totalPages: 0,
  };
}
export function resetTableFilterOptions() {
  return {
    category: null,
    search_key: '',
    slug: '',
    name: '',
    stock_status: '',
    list_type: '',
    _id: '',
    order_status: null,
    tags: null,
    classifications: null,
    status: null,
    from_date: null,
    to_date: null,
    email_verified: null,
    mobile_verified: null,
    brand: null,
    type: null,
    min_price: null,
    max_price: null,
    currency: null,
    payment_status: null,
    payment_method: null,
    min_amount: null,
    max_amount: null,
    rating: null,
    is_marketing: null,
    event: null,
    channel: null,
    provider: null,
    outcome: null,
  };
}

// Generic active/inactive status used by virtually every list model in
// this app (matches the enum on User, Product, Category, etc.) — reused
// across filter drawers instead of redefined per page.
export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const VERIFIED_OPTIONS: { value: string; label: string }[] = [
  { value: 'yes', label: 'Verified' },
  { value: 'no', label: 'Not Verified' },
];

export function scrollToQuery(query: any) {
  let $_errFormControl = document.querySelectorAll(query);
  if ($_errFormControl.length > 0) {
    const firstErr: Element = $_errFormControl[0];
    firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export function isImage(fileName: string) {
  // List of common image file extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];

  // Convert the file name to lowercase and remove the leading dot
  const lowerCaseFileName = fileName.toLowerCase().replace(/^\./, '');

  // Check if the file name ends with any of the image extensions
  return imageExtensions.some((extension) =>
    lowerCaseFileName.endsWith(extension),
  );
}
export function getFormGroupArray(formGroup: FormGroup, type: any) {
  return (formGroup.get(type) as FormArray).controls;
}

export function removeFormGroupArrRow(
  formGroup: FormGroup,
  type: any,
  index: number,
) {
  const control = <FormArray>formGroup.get(type);
  control.removeAt(index);
}

export function resetFormGroupArrRow(formGroup: FormGroup, type: any) {
  const control = <FormArray>formGroup.get(type);
  control.clear();
}

export function fetchFormGroupIndexOfControl(
  formGroup: FormGroup,
  type: any,
  s_key: any,
  s_value: any,
) {
  let arr: any[] = formGroup.value?.[type];
  if (Array.isArray(arr)) {
    let index: any = arr.findIndex((x) => x[s_key] == s_value);
    return index;
  }

  return false;
}

export function openLinkInNewTab(relativeUrl: string): void {
  // Attempt to find the <base> tag and get its href attribute
  const baseElement = document.querySelector('base');
  let baseHref = '';

  if (baseElement) {
    baseHref = baseElement.getAttribute('href') || '';
  } else {
    console.warn(
      '<base> tag not found. Falling back to window.location.origin.',
    );
    // Fallback to using window.location.origin if no <base> tag is present
    baseHref = window.location.origin;
  }
  // Construct the full URL
  const fullUrl = `${baseHref}${relativeUrl}`;
  // Open the URL in a new tab
  window.open(fullUrl, '_blank');
}
export function MustMatch(controlName: string, matchingControlName: string) {
  return (group: AbstractControl) => {
    const control = group.get(controlName);
    const matchingControl = group.get(matchingControlName);

    if (!control || !matchingControl) {
      return null;
    }

    // return if another validator has already found an error on the matchingControl
    if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
      return null;
    }

    // set error on matchingControl if validation fails
    if (control.value !== matchingControl.value) {
      matchingControl.setErrors({ mustMatch: true });
    } else {
      matchingControl.setErrors(null);
    }
    return null;
  };
}
export function YEARS() {
  let startYear = 2024;
  let currentYear = new Date().getFullYear();
  let years = [];

  for (let year = startYear; year <= currentYear; year++) {
    years.push(year);
  }

  return years;
}
export function getFileExtension(filePath: string) {
  return filePath.split('.').pop();
}

// Order status is shipping-partner-driven (order_status on Order, not a
// fixed admin-defined list) with no single enforced enum — real values seen
// in this DB include hyphenated multi-word ones like "out-for-delivery" /
// "pickup-exception" / "return-in-transit". A hardcoded status->color map
// silently falls back to "no color" for anything it doesn't enumerate. This
// covers the known statuses with a sensible semantic color and hashes
// anything unrecognized to a stable color from a fixed palette, so it's
// never unstyled.
const SEMANTIC_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  processing: '#0ea5e9',
  confirmed: '#0ea5e9',
  packed: '#6366f1',
  'picked-up': '#6366f1',
  'out-for-pickup': '#6366f1',
  'pickup-exception': '#f97316',
  shipped: '#8b5cf6',
  intransit: '#8b5cf6',
  'in-transit': '#8b5cf6',
  'reached-at-destin': '#8b5cf6',
  'out-for-delivery': '#a855f7',
  delivered: '#22c55e',
  'rto-delivered': '#22c55e',
  cancelled: '#ef4444',
  canceled: '#ef4444',
  failed: '#ef4444',
  undelivered: '#ef4444',
  'return-initiated': '#f97316',
  'return-in-transit': '#f97316',
  'order-returned': '#f97316',
  returned: '#f97316',
};
const STATUS_HASH_PALETTE = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#6366f1',
  '#ef4444',
  '#0ea5e9',
  '#a855f7',
  '#f97316',
  '#14b8a6',
  '#84cc16',
];

export function statusColor(status: string | undefined | null): string {
  const key = (status || '').trim().toLowerCase();
  if (SEMANTIC_STATUS_COLORS[key]) return SEMANTIC_STATUS_COLORS[key];

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return STATUS_HASH_PALETTE[Math.abs(hash) % STATUS_HASH_PALETTE.length];
}
