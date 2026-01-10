import { Component, HostListener } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { HelpersService } from 'app/core/services/helpers.service';
import { Title } from '@angular/platform-browser';
import * as Global from 'app/global';
import { NgxSpinnerModule } from 'ngx-spinner';
import { DeviceDetectorService } from './core/services/device-detector.service';

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
    public deviceService: DeviceDetectorService
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const route = this.getActivatedRouteChild(this.activatedRoute);
        route.data.subscribe((data: any) => {
          if (data?.pageTitle) {
            this.titleService.setTitle(
              data?.pageTitle + ' | ' + this.PageMainTitle
            );
          } else {
            this.titleService.setTitle(this.PageMainTitle);
          }
        });
        this.breadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
        this.helperService.updateBreadCrumbs(this.breadcrumbs);
      });
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
