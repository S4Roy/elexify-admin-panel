import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
@Component({ standalone: true, template: `<main class="p-8"><h1 class="text-2xl font-semibold">Access denied</h1><p class="my-4">You do not have permission to open this page. Contact your administrator to request access.</p><button class="underline" (click)="auth.userLogout()">Sign out</button></main>` })
export class AccessDeniedComponent { readonly auth = inject(AuthService); }
