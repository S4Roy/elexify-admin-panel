import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StocksComponent } from './stocks.component';
import { sharedTestProviders, activatedRouteStub, matDialogDataProvider, matDialogRefStub } from '../../../../../../../testing/shared-test-providers';

describe('StocksComponent', () => {
  let component: StocksComponent;
  let fixture: ComponentFixture<StocksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StocksComponent],
      providers: [...sharedTestProviders(), activatedRouteStub(), matDialogDataProvider(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(StocksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
