import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { sharedTestProviders, activatedRouteStub } from '../testing/shared-test-providers';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    }).compileComponents();
  });

  // The other two tests originally generated here ("should have the title",
  // "should render title") asserted the Angular CLI's default scaffold
  // content (a string `title` property, an <h1>Hello, ...</h1> in the
  // template). This app's real AppComponent was fully built out and never
  // matched that scaffold: `title` is a method that throws
  // "Method not implemented" (app.component.ts), and the real template is
  // just <router-outlet> + a spinner, with no <h1> at all. Both assertions
  // were checking content that has never existed in this app - removed as
  // genuinely obsolete rather than fixed, since there is nothing real left
  // to assert in their place.
  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
