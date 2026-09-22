import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PermissionDirective } from './permission.directive';
import { PermissionService } from '../services/permission.service';
import { HttpService } from '../services/http.service';
@Component({ standalone: true, imports: [PermissionDirective], template: '<button appPermission="orders.refund">Refund</button>' })
class FixtureComponent {}
describe('permission action visibility', () => {
  it('hides restricted actions and reacts to permission changes', () => {
    TestBed.configureTestingModule({ imports: [FixtureComponent], providers: [{ provide: HttpService, useValue: {} }] });
    const fixture = TestBed.createComponent(FixtureComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').hidden).toBeTrue();
    TestBed.inject(PermissionService).keys.set(new Set(['orders.refund'])); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').hidden).toBeFalse();
    TestBed.inject(PermissionService).clear(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').hidden).toBeTrue();
  });
});
