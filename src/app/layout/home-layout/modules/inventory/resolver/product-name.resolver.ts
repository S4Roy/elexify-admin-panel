// product-name.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { InventoryService } from 'app/core/services/inventory.service';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const productNameResolver: ResolveFn<string> = (
  route: ActivatedRouteSnapshot
) => {
  const inventoryService = inject(InventoryService);
  const slug = route.paramMap.get('slug');

  if (!slug) return of('Product');
  return inventoryService.productBySlug(slug).pipe(
    map((res: any) => res?.data ?? 'Product'),
    catchError(() => of('Product'))
  );
};
