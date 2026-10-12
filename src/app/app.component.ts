import { Component, HostListener } from '@angular/core';
import {
  ActivatedRoute,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter, take } from 'rxjs';
import { HelpersService } from 'app/core/services/helpers.service';
import { Title } from '@angular/platform-browser';
import * as Global from 'app/global';
import { NgxSpinnerModule } from 'ngx-spinner';
import { DeviceDetectorService } from './core/services/device-detector.service';
import { ThemeService } from './core/services/theme.service';

// The boot splash in index.html stays up at least this long so its brand
// reveal (≈0.75s) plays through instead of flashing on fast loads.
const BOOT_SPLASH_MIN_MS = 900;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSpinnerModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title(title: any) {
    throw new Error('Method not implemented.');
  }
  GLobal = Global;
  PageMainTitle = Global.APP_NAME;
  breadcrumbs: Array<{ label: string; url: string }> = [];

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private helperService: HelpersService,
    private titleService: Title,
    public deviceService: DeviceDetectorService,
    public themeService: ThemeService
  ) {
    // Clear the header search before the next page reads it (NavigationStart),
    // unless only the query string changes on the same page.
    const pathOf = (url: string) => url.split(/[?#]/)[0];
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe((event) => {
        if (pathOf((event as NavigationStart).url) !== pathOf(this.router.url)) this.helperService.clearSearchTerm();
      });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError),
        take(1)
      )
      .subscribe(() => this.hideBootSplash());
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const route = this.getActivatedRouteChild(this.activatedRoute);
        route.data.subscribe((data: any) => {
          // Like breadcrumbs, a title may be a function of the route
          // (e.g. Orders - Confirmed & Processing).
          const pageTitle = typeof data?.pageTitle === 'function'
            ? data.pageTitle(data, route.snapshot)
            : data?.pageTitle;
          if (pageTitle) {
            this.titleService.setTitle(
              pageTitle + ' | ' + this.PageMainTitle
            );
          } else {
            this.titleService.setTitle(this.PageMainTitle);
          }
        });
        this.breadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
        this.helperService.updateBreadCrumbs(this.breadcrumbs);
      });
  }

  private hideBootSplash(): void {
    const splash = document.getElementById('boot-splash');
    if (!splash) return;
    const wait = Math.max(0, BOOT_SPLASH_MIN_MS - performance.now());
    setTimeout(() => {
      splash.classList.add('is-hiding');
      setTimeout(() => splash.remove(), 300);
    }, wait);
  }

  private createBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: Array<{ label: string; url: string }> = []
  ): Array<{ label: string; url: string }> {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      const routeURL: string = child.snapshot.url
        .map((segment) => segment.path)
        .join('/');
      if (routeURL !== '') {
        url += `/${routeURL}`;
      }

      let label = '';
      const data = child.snapshot.data;
      const breadcrumb = data['breadcrumb'];

      if (typeof breadcrumb === 'function') {
        label = breadcrumb(data, child.snapshot); // Execute the breadcrumb function
      } else if (breadcrumb) {
        label = breadcrumb;
      }

      if (label) {
        breadcrumbs.push({ label, url });
      }

      return this.createBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }

  getActivatedRouteChild(activatedRoute: ActivatedRoute): ActivatedRoute {
    if (activatedRoute.firstChild) {
      return this.getActivatedRouteChild(activatedRoute.firstChild);
    } else {
      return activatedRoute;
    }
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    const width = (event.target as Window).innerWidth;
    this.deviceService.updateDeviceType(width);
  }
}
