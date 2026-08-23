import { NgFor, NgIf, KeyValuePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from 'app/core/services/auth.service';
import { NavigationService } from 'app/core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  imports: [NgFor, NgIf, KeyValuePipe, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './preview-panel.component.html',
  styleUrl: './preview-panel.component.scss',
})
export class PreviewPanelComponent implements OnInit {
  storefrontUrl = environment.STOREFRONT_URL ?? '';
  loading = false;
  summary: any = null;

  constructor(
    private navigationService: NavigationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.navigationService.combinedPreview().subscribe({
      next: (res: any) => {
        this.summary = res?.data ?? res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  menuItemCount(items: any[]): number {
    if (!items?.length) return 0;
    let count = 0;
    const walk = (list: any[]) => {
      list.forEach((n) => {
        count++;
        if (n.children?.length) walk(n.children);
      });
    };
    walk(items);
    return count;
  }

  openPreview() {
    const token = this.authService.getUserToken();
    window.open(`${this.storefrontUrl}/preview/navigation?token=${token}`, '_blank');
  }
}
