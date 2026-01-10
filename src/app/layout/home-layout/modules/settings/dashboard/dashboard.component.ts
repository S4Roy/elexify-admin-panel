import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RouterCardComponent } from 'app/layout/home-layout/includes/router-card/router-card.component';

@Component({
  selector: 'app-dashboard',
  imports: [NgFor, RouterModule, RouterCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  nav_list: any = [
    {
      label: 'Site Settings',
      description: 'Manage Site Info',
      router_path: '/settings/site',
    },
    {
      label: 'Media',
      description: 'Manage Media',
      router_path: '/settings/media',
      icon: 'assets/list-outline.png',
    },
    {
      label: 'Countries',
      description: 'Manage countries',
      router_path: '/settings/countries',
      icon: 'assets/list-outline.png',
    },
    {
      label: 'States',
      description: 'Manage States',
      router_path: '/settings/states',
      icon: 'assets/list-outline.png',
    },
    {
      label: 'Cities',
      description: 'Manage Cities',
      router_path: '/settings/cities',
      icon: 'assets/list-outline.png',
    },
    {
      label: 'Currency',
      description: 'Manage Currency',
      router_path: '/settings/currency',
      icon: 'assets/list-outline.png',
    },
    // {
    //   label: 'Frequently Ask Questions',
    //   description: 'Manage Data',
    //   router_path: '/settings/faq',
    // },
    // {
    //   label: 'User Role & Permissions',
    //   description: 'Manage Role & Permissions',
    //   router_path: '/settings/user-role-permissions',
    //   icon: 'assets/user-vector.png',
    // },
    {
      label: 'Terms of Service',
      description: 'Add Terms of service',
      router_path: '/settings/terms-of-service',
      icon: 'assets/list-outline.png',
    },
    {
      label: 'Privacy Policy',
      description: 'Add Privacy Policy',
      router_path: '/settings/privacy-policy',
      icon: 'assets/list-outline.png',
    },
    {
      label: 'Refund Policy',
      description: 'Add Refund Policy',
      router_path: '/settings/refund-policy',
      icon: 'assets/list-outline.png',
    },
    {
      label: 'Shipping Policy',
      description: 'Add Shipping Policy',
      router_path: '/settings/shipping-policy',
      icon: 'assets/list-outline.png',
    },
    // {
    //   label: 'FAQ Category',
    //   description: 'Manage Category',
    //   router_path: '/settings/faq/category',
    // },

    // {
    //   label: 'Contact Purpose',
    //   description: 'Manage Contact Purpose',
    //   router_path: '/settings/contact-purpose',
    //   icon: 'assets/user-vector.png',
    // },
  ];
  constructor() {}
}
