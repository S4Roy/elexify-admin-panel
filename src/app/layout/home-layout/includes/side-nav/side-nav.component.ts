import {
  Component,
  ElementRef,
  Input,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { isImage } from '../../../../global';
import { SettingsService } from '../../../../core/services/settings.service';
import { NavService } from 'app/core/services/nav.service';

@Component({
  selector: 'app-side-nav',
  imports: [NgIf, NgFor, MatIconModule, RouterModule, NgClass],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss',
})
export class SideNavComponent {
  @ViewChildren('menuItem') menuItems!: QueryList<ElementRef>;
  @Input() isNavOpen: boolean = true;
  itemList: any = [
    {
      title: 'Main',
      description: 'Manage your page',
      menuItems: [
        {
          label: 'Dashboard',
          icon: 'dashboard',
          url: '/dashboard',
          exact: true,
        },
        {
          label: 'Inventory',
          icon: 'web',
          url: '/inventory',
          childMenuItems: [
            {
              label: 'Dashboard',
              url: '/inventory/dashboard',
              exact: true,
            },
            {
              label: 'Attributes',
              url: '/inventory/attributes',
              exact: true,
            },
            {
              label: 'Tags',
              url: '/inventory/tags',
              exact: true,
            },
            {
              label: 'Brands',
              url: '/inventory/brands',
              exact: true,
            },
            {
              label: 'Classification',
              url: '/inventory/classification',
              exact: true,
            },
            {
              label: 'Parent Categories',
              url: '/inventory/categories/parent',
              exact: true,
            },
            {
              label: 'Sub Categories',
              url: '/inventory/categories/sub',
              exact: true,
            },
            {
              label: 'Products',
              url: '/inventory/products',
              exact: true,
            },
            {
              label: 'Coupons',
              url: '/inventory/coupons',
              exact: true,
            },
            {
              label: 'Orders',
              url: '/inventory/orders',
              exact: true,
            },
          ],
        },
        {
          label: 'Pages',
          icon: 'web',
          url: '/pages',
          childMenuItems: [
            {
              label: 'Home',
              url: '/pages/home',
              exact: true,
            },
            // {
            //   label: 'Why Elexify Industries',
            //   url: '/pages/why-elexify',
            //   exact: true,
            // },
            // {
            //   label: 'About Us',
            //   url: '/pages/about',
            //   exact: true,
            // },
            // {
            //   label: 'Why ANCTPL?',
            //   url: '/pages/why-anctpl',
            //   exact: true,
            // },
            // {
            //   label: 'Services',
            //   url: '/pages/service',
            //   exact: true,
            // },
            // {
            //   label: 'FAQs',
            //   url: '/pages/faq',
            //   exact: true,
            // },
            // {
            //   label: 'Awards',
            //   url: '/pages/awards',
            //   exact: true,
            // },
            // {
            //   label: 'News & Events',
            //   url: '/pages/news_event',
            //   exact: true,
            // },
            // {
            //   label: 'Success Stories',
            //   url: '/pages/success_story',
            //   exact: true,
            // },
            // {
            //   label: 'Gallery',
            //   url: '/pages/gallery',
            //   exact: true,
            // },
            // {
            //   label: 'Career',
            //   url: '/pages/career',
            //   exact: true,
            // },
            // {
            //   label: 'Tender',
            //   url: '/pages/tender',
            //   exact: true,
            // },
            // {
            //   label: 'Clientele',
            //   url: '/pages/clientele',
            //   exact: true,
            // },

            // {
            //   label: 'Contact Us',
            //   url: '/pages/contact_us',
            //   exact: true,
            // },
          ],
        },
        {
          label: 'Enquiries',
          image_path: 'assets/sidebar_icon/users.svg',
          url: '/enquiries',
          exact: true,
        },
      ],
    },
    {
      title: 'Others',
      description: 'Manage your details',
      menuItems: [
        {
          label: 'Settings',
          icon: 'settings',
          image_path: 'assets/sidebar_icon/settings.svg',
          url: '/settings',
          childMenuItems: [
            {
              label: 'Dashboard',
              url: '/settings/dashboard',
              exact: true,
            },
            {
              label: 'Site Settings',
              url: '/settings/site',
              exact: true,
            },
            {
              label: 'Media',
              url: '/settings/media',
              exact: true,
            },
            {
              label: 'Countries',
              url: '/settings/countries',
              exact: true,
            },
            {
              label: 'States',
              url: '/settings/states',
              exact: true,
            },
            {
              label: 'Cities',
              url: '/settings/cities',
              exact: true,
            },
            // {
            //   label: 'Countries',
            //   url: '/settings/countries',
            //   exact: true,
            // },
            {
              label: 'Currency',
              url: '/settings/currency',
              exact: true,
            },
            {
              label: 'Terms of Service',
              url: '/settings/terms-of-service',
              exact: true,
            },
            {
              label: 'Privacy Policy',
              url: '/settings/privacy-policy',
              exact: true,
            },
            {
              label: 'Refund Policy',
              url: '/settings/refund-policy',
              exact: true,
            },
            {
              label: 'Shipping Policy',
              url: '/settings/shipping-policy',
              exact: true,
            },
          ],
        },
        {
          label: 'Customers',
          icon: 'contacts',
          image_path: 'assets/sidebar_icon/users.svg',
          url: '/customers',
        },
        // {
        //   label: 'Testimonials',
        //   icon: 'contacts',
        //   image_path: 'assets/sidebar_icon/users.svg',
        //   url: '/testimonials',
        // },
        {
          label: 'FAQs',
          icon: 'contacts',
          image_path: 'assets/sidebar_icon/users.svg',
          url: '/faqs',
        },
        {
          label: 'Consultation',
          icon: 'contacts',
          image_path: 'assets/sidebar_icon/users.svg',
          url: '/consultation',
        },
        {
          label: 'Blogs',
          icon: 'contacts',
          image_path: 'assets/sidebar_icon/users.svg',
          url: '/blogs',
        },
        {
          label: 'Rating & Reviews',
          icon: 'contacts',
          image_path: 'assets/sidebar_icon/users.svg',
          url: '/ratings',
        },
        {
          label: 'Contact us',
          icon: 'contacts',
          image_path: 'assets/sidebar_icon/users.svg',
          url: '/contact-us',
        },
        {
          label: 'Subscriber',
          icon: 'contacts',
          image_path: 'assets/sidebar_icon/users.svg',
          url: '/subscriber',
        },
      ],
    },
    {
      title: 'Master',
      description: 'Manage your details',
      menuItems: [
        {
          label: 'Master',
          icon: 'settings',
          image_path: 'assets/sidebar_icon/settings.svg',
          url: '/masters',
          childMenuItems: [
            {
              label: 'Specifications',
              url: '/masters/specifications',
              exact: true,
            },
          ],
        },
      ],
    },
  ];
  constructor(
    private router: Router,
    private settingService: SettingsService,
    public navService: NavService
  ) {
    // this.fetchMenuList();
  }
  fetchMenuList() {
    this.settingService.menuList().subscribe({
      next: (res: any) => {
        this.itemList = res?.results;
      },
      error: (err: any) => {},
    });
  }
  ngAfterViewInit() {
    setTimeout(() => {
      // Delay to allow rendering
      this.scrollToActive();
    }, 500);
  }
  isActiveChild(menu: any): boolean {
    const currentUrl = this.router.url;
    return (
      currentUrl.startsWith(menu?.url) ||
      menu?.childMenuItems?.some((child: any) =>
        currentUrl.startsWith(child?.url)
      )
    );
  }

  scrollToActive() {
    const activeItem = this.menuItems.find((item) =>
      item.nativeElement.classList.contains('active')
    );

    if (activeItem) {
      activeItem.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }
}
