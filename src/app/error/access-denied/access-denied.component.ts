import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  standalone: true,
  imports: [NgIf, RouterLink, MatIconModule],
  templateUrl: './access-denied.component.html',
  styleUrl: '../error-page.scss',
})
export class AccessDeniedComponent {
  readonly auth = inject(AuthService);
  private readonly permissions = inject(PermissionService);
  get availablePage(): string | null {
    const destination = this.permissions.landingUrl();
    return destination === '/access-denied' ? null : destination;
  }
}
