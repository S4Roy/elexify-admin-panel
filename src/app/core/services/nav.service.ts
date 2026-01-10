import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NavService {
  private isSideNavOpenSubject = new BehaviorSubject<boolean>(true);
  private isMenuOpenSubject = new BehaviorSubject<boolean>(false);

  isSideNavOpen$ = this.isSideNavOpenSubject.asObservable();
  isMenuOpen$ = this.isMenuOpenSubject.asObservable();

  // Get current values
  get isSideNavOpen(): boolean {
    return this.isSideNavOpenSubject.value;
  }

  get isMenuOpen(): boolean {
    return this.isMenuOpenSubject.value;
  }

  // Toggle or set explicitly
  toggleSideNav(): void {
    this.isSideNavOpenSubject.next(!this.isSideNavOpen);
  }

  openSideNav(): void {
    this.isSideNavOpenSubject.next(true);
  }

  closeSideNav(): void {
    this.isSideNavOpenSubject.next(false);
  }

  toggleMenu(): void {
    this.isMenuOpenSubject.next(!this.isMenuOpen);
  }

  openMenu(): void {
    this.isMenuOpenSubject.next(true);
  }

  closeMenu(): void {
    this.isMenuOpenSubject.next(false);
  }
}
