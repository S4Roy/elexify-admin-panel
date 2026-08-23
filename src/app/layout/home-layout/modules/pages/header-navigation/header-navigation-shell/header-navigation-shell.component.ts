import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface NavTab {
  label: string;
  path: string;
  icon: string;
}

const TABS: NavTab[] = [
  { label: 'Top Bar', path: 'top-bar', icon: 'view_headline' },
  { label: 'Header', path: 'header', icon: 'web_asset' },
  { label: 'Menus', path: 'menus', icon: 'account_tree' },
  { label: 'Preview', path: 'preview', icon: 'visibility' },
];

@Component({
  selector: 'app-header-navigation-shell',
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive, RouterOutlet, MatIconModule],
  templateUrl: './header-navigation-shell.component.html',
  styleUrl: './header-navigation-shell.component.scss',
})
export class HeaderNavigationShellComponent {
  tabs = TABS;
}
