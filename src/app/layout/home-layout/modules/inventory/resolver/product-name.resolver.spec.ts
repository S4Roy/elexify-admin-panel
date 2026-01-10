import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { productNameResolver } from './product-name.resolver';

describe('productNameResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => productNameResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
