import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { PermissionService } from '../services/permission.service';
@Directive({ selector: '[appPermission]', standalone: true })
export class PermissionDirective {
  readonly appPermission = input.required<string | string[]>();
  private access = inject(PermissionService);
  private element = inject(ElementRef<HTMLElement>);
  constructor() { effect(() => { const permission = this.appPermission(); const denied = !(Array.isArray(permission) ? this.access.canAll(permission) : this.access.can(permission)); this.element.nativeElement.hidden = denied; if (denied) this.element.nativeElement.style.setProperty('display', 'none', 'important'); else this.element.nativeElement.style.removeProperty('display'); }); }
}
