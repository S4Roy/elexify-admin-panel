import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewFaqComponent } from './new-faq.component';
import { sharedTestProviders, matDialogDataProvider, matDialogRefStub } from '../../../../../../testing/shared-test-providers';

describe('NewFaqComponent', () => {
  let component: NewFaqComponent;
  let fixture: ComponentFixture<NewFaqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewFaqComponent],
      providers: [...sharedTestProviders(), matDialogDataProvider(), matDialogRefStub()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewFaqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
