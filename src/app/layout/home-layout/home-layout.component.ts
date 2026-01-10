import { Component } from '@angular/core';
import { HeaderComponent } from './includes/header/header.component';
import { SideNavComponent } from './includes/side-nav/side-nav.component';
import { RouterModule } from '@angular/router';
import { NavService } from 'app/core/services/nav.service';
import { BreadcumsComponent } from './includes/breadcums/breadcums.component';
import { HelpersService } from 'app/core/services/helpers.service';
import { DeviceDetectorService } from 'app/core/services/device-detector.service';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-home-layout',
  imports: [
    HeaderComponent,
    SideNavComponent,
    RouterModule,
    BreadcumsComponent,
    NgIf,
  ],
  templateUrl: './home-layout.component.html',
  styleUrl: './home-layout.component.scss',
})
export class HomeLayoutComponent {
  isNavOpen: boolean = true;
  pagesOutlet: boolean = false;
  breadcrumbs: any = [];
  constructor(
    public navService: NavService,
    private helperService: HelpersService,
    public device: DeviceDetectorService
  ) {}
  ngOnInit() {}
}
