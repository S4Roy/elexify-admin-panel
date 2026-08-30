import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateAllVariationsComponent } from './update-all-variations.component';
import { sharedTestProviders, matDialogRefStub } from '../../../../../../../../../testing/shared-test-providers';

describe('UpdateAllVariationsComponent', () => {
  let component: UpdateAllVariationsComponent;
  let fixture: ComponentFixture<UpdateAllVariationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateAllVariationsComponent],
      providers: [...sharedTestProviders(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateAllVariationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
