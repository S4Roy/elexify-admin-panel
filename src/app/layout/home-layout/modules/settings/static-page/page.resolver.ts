import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, ResolveFn } from "@angular/router";
import { ApiService } from "app/core/services/api.service";
import { catchError, map, of } from "rxjs";

export const pageResolver: ResolveFn<string> = (
  route: ActivatedRouteSnapshot
) => {
  const apiService = inject(ApiService);
  const slug = route.paramMap.get("slug");

  if (!slug) return of("Page");
  return apiService.getPage(slug).pipe(
    map((res: any) => res?.data ?? "Page"),
    catchError(() => of("Page"))
  );
};
