import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DeviceDetectorService {
  private deviceTypeSubject = new BehaviorSubject<
    'mobile' | 'tablet' | 'desktop'
  >(this.getDeviceType());
  deviceType$ = this.deviceTypeSubject.asObservable();

  constructor() {}

  updateDeviceType(width: number) {
    const type = this.detectType(width);
    this.deviceTypeSubject.next(type);
  }

  private detectType(width: number): 'mobile' | 'tablet' | 'desktop' {
    if (width <= 767) return 'mobile';
    if (width >= 768 && width <= 1024) return 'tablet';
    return 'desktop';
  }

  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    return this.detectType(window.innerWidth);
  }

  isMobile(): boolean {
    return this.getDeviceType() === 'mobile';
  }

  isTablet(): boolean {
    return this.getDeviceType() === 'tablet';
  }

  isDesktop(): boolean {
    return this.getDeviceType() === 'desktop';
  }
}
