import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SideNavComponent } from './side-nav.component';
import { sharedTestProviders, activatedRouteStub } from '../../../../../testing/shared-test-providers';

describe('SideNavComponent', () => {
  let component: SideNavComponent;
  let fixture: ComponentFixture<SideNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideNavComponent],
      providers: [...sharedTestProviders(), activatedRouteStub()],
    }).compileComponents();

    fixture = TestBed.createComponent(SideNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggling a collapsed-by-default menu expands it', () => {
    const menu = { label: 'Inventory', childMenuItems: [{ url: '/inventory/products' }] };
    // Not on any child route, so it starts collapsed by default.
    expect(component.isMenuExpanded(menu)).toBe(false);

    const event = new MouseEvent('click');
    component.toggleMenu(menu, event);
    expect(component.isMenuExpanded(menu)).toBe(true);
  });

  it('toggling twice returns to the route-based default', () => {
    const menu = { label: 'Inventory', childMenuItems: [{ url: '/inventory/products' }] };
    const event = new MouseEvent('click');

    component.toggleMenu(menu, event);
    expect(component.isMenuExpanded(menu)).toBe(true);

    component.toggleMenu(menu, event);
    expect(component.isMenuExpanded(menu)).toBe(false);
  });

  it('toggle does not navigate away — it stops the click from bubbling to the parent routerLink', () => {
    const menu = { label: 'Inventory', childMenuItems: [{ url: '/inventory/products' }] };
    const event = new MouseEvent('click', { cancelable: true, bubbles: true });
    const stopPropagationSpy = spyOn(event, 'stopPropagation');
    const preventDefaultSpy = spyOn(event, 'preventDefault');

    component.toggleMenu(menu, event);

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
