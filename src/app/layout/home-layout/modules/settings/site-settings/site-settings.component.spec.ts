import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SiteSettingsComponent } from './site-settings.component';
import { sharedTestProviders } from '../../../../../../testing/shared-test-providers';

describe('SiteSettingsComponent', () => {
  let component: SiteSettingsComponent;
  let fixture: ComponentFixture<SiteSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteSettingsComponent],
      providers: [...sharedTestProviders()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SiteSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
