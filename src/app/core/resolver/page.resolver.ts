import { ResolveFn } from '@angular/router';
import { HelpersService } from '../services/helpers.service';
import { inject } from '@angular/core';

export const pageResolver: ResolveFn<any> = (route, state) => {
  const helperService = inject(HelpersService); // Use inject to get the service
  const pageType = route.paramMap.get('page_type');
  let data = null;
  helperService.getPageData(pageType).subscribe((res: any) => {
    data = res;
  });
  return data;
};
