import { JsonPipe, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { Component } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { filter } from 'rxjs';
import { HelpersService } from '../../../../core/services/helpers.service';

@Component({
  selector: 'app-breadcums',
  //imports: [NgFor, RouterModule, UpperCasePipe, NgIf,JsonPipe ],
  imports: [NgFor, RouterModule, UpperCasePipe, NgIf ],
  templateUrl: './breadcums.component.html',
  styleUrl: './breadcums.component.scss',
})
export class BreadcumsComponent {
  breadcrumbs: any = [];
  settingsOutlet: boolean = false;
  usersOutlet : boolean =false;
  constructor(private helperService: HelpersService) {
    this.helperService.breadcrumbs$.subscribe((res: any) => {
      
      this.breadcrumbs = res;
      this.settingsOutlet = this.breadcrumbs.some((item: any) => item?.label === "Settings");
      this.usersOutlet = this.breadcrumbs.some((item: any) => item?.label === "Users");
    });
    
  }
}
