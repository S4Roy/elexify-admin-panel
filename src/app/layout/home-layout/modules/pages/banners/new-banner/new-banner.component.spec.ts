import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewBannerComponent } from './new-banner.component';
import { sharedTestProviders, activatedRouteStub, matDialogDataProvider, matDialogRefStub } from '../../../../../../../testing/shared-test-providers';

describe('NewBannerComponent', () => {
  let component: NewBannerComponent;
  let fixture: ComponentFixture<NewBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewBannerComponent],
      providers: [...sharedTestProviders(), activatedRouteStub(), matDialogDataProvider(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
