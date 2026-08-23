import {
  Component,
  ElementRef,
  Input,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
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
  @ViewChild('flyoutEl') flyoutEl?: ElementRef<HTMLElement>;
  @Input() isNavOpen: boolean = true;

  /** Matches the collapsed sidebar width in styles.scss (.sidenav-collapsed). */
  readonly collapsedRailWidth = 76;
  hoveredMenu: any = null;
  hoveredMenuTop = 0;
  private hoverCloseTimeout?: ReturnType<typeof setTimeout>;

  // Manual expand/collapse override per parent menu (keyed by label) — a
  // parent with children defaults to expanded exactly while one of its
  // children is the active route (isActiveChild), but that alone gave no
  // way to collapse it while still on one of its pages, or expand it while
  // browsing elsewhere. Once the user clicks the chevron, their choice
  // wins over the route-based default until they click it again.
  private menuOverrides = new Map<string, boolean>();

  // Grouped Main / Content / Support / Settings — the standard split used
  // by most e-commerce admin panels: day-to-day operational data first,
  // outbound marketing/CMS content second, inbound customer communication
  // third, site configuration last. Orders promoted to its own top-level
  // item (still routes to /inventory/orders — the module wasn't split,
  // just the menu entry) since it's one of the most-used sections in
  // day-to-day operation. Abandoned Carts / Notification Logs / FAQ
  // Category / Email Templates from the reference structure are left out
  // — there's no matching route for them in this app.
  itemList: any = [
    {
      title: 'Main',
      groupUrl: '/dashboard',
      description: 'Manage your page',
      menuItems: [
        {
          label: 'Dashboard',
          icon: 'dashboard',
          url: '/dashboard',
          exact: true,
        },
        {
          label: 'Orders',
          icon: 'shopping_cart',
          url: '/inventory/orders',
        },
        {
          label: 'Inventory',
          icon: 'inventory_2',
          url: '/inventory',
          childMenuItems: [
            {
              label: 'Dashboard',
              url: '/inventory/dashboard',
              exact: true,
            },
            {
              label: 'Products',
              url: '/inventory/products',
              exact: true,
            },
            {
              label: 'SEO Manager',
              url: '/inventory/products/seo-manager',
              exact: true,
            },
            {
              label: 'Categories',
              url: '/inventory/categories',
              exact: true,
            },
            {
              label: 'Brands',
              url: '/inventory/brands',
              exact: true,
            },
            {
              label: 'Attributes',
              url: '/inventory/attributes',
              exact: true,
            },
            {
              label: 'Specifications',
              url: '/masters/specifications',
              exact: true,
            },
            {
              label: 'Tags',
              url: '/inventory/tags',
              exact: true,
            },
            {
              label: 'Classification',
              url: '/inventory/classification',
              exact: true,
            },
            {
              label: 'Coupons',
              url: '/inventory/coupons',
              exact: true,
            },
            {
              label: 'Shipping Classes',
              url: '/inventory/shipping-classes',
              exact: true,
            },
            {
              label: 'Shipping Zones',
              url: '/inventory/shipping-zones',
              exact: true,
            },
            {
              label: 'Shipping Rates',
              url: '/inventory/shipping-rates',
              exact: true,
            },
          ],
        },
        {
          label: 'Customers',
          icon: 'group',
          url: '/customers',
        },
      ],
    },
    {
      // Public-facing/marketing content — what shows up on the storefront.
      title: 'Content',
      description: 'Manage your details',
      menuItems: [
        {
          label: 'Pages',
          icon: 'description',
          url: '/pages',
          childMenuItems: [
            // {
            //   label: 'Home',
            //   url: '/pages/home',
            //   exact: true,
            // },
            {
              label: 'Homepage',
              icon: 'dashboard_customize',
              url: '/pages/homepage',
              exact: true,
            },
            {
              label: 'Header & Navigation',
              icon: 'view_headline',
              url: '/pages/header-navigation',
              exact: false,
            },
          ],
        },

        {
          label: 'Blogs',
          icon: 'article',
          url: '/blogs',
        },
        {
          label: 'Rating & Reviews',
          icon: 'reviews',
          url: '/ratings',
        },
      ],
    },
    {
      // Customer communication/self-service — inbound questions and how
      // shoppers reach out, kept apart from the outbound marketing content
      // above.
      title: 'Support',
      description: 'Manage your details',
      menuItems: [
        {
          label: 'FAQs',
          icon: 'quiz',
          url: '/faqs',
          exact: true,
        },
        {
          label: 'Enquiries',
          icon: 'forum',
          url: '/enquiries',
          exact: true,
        },
        {
          label: 'Consultation',
          icon: 'support_agent',
          url: '/consultation',
        },
        {
          label: 'Contact us',
          icon: 'contact_phone',
          url: '/contact-us',
        },
        {
          label: 'Subscriber',
          icon: 'mail',
          url: '/subscriber',
        },
      ],
    },
    {
      title: 'Settings',
      groupUrl: '/settings/dashboard',
      description: 'Manage your details',
      menuItems: [
        {
          label: 'Settings',
          icon: 'settings',
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
            {
              label: 'Shipping Settings',
              url: '/settings/shipping-settings',
              exact: true,
            },
            {
              label: 'SEO Settings',
              url: '/settings/seo',
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
    public navService: NavService,
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
  onMenuEnter(menu: any, event: MouseEvent): void {
    if (!menu?.childMenuItems?.length || this.isNavOpen) {
      return;
    }
    clearTimeout(this.hoverCloseTimeout);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.hoveredMenuTop = rect.top;
    this.hoveredMenu = menu;

    // Flyout height depends on how many children it has, so measure the
    // actual rendered box after this tick and pull it back up if it would
    // run past the bottom of the viewport (e.g. the last item in the list).
    setTimeout(() => {
      const flyout = this.flyoutEl?.nativeElement;
      if (!flyout || this.hoveredMenu !== menu) {
        return;
      }
      const margin = 8;
      const height = flyout.getBoundingClientRect().height;
      const maxTop = window.innerHeight - height - margin;
      if (this.hoveredMenuTop > maxTop) {
        this.hoveredMenuTop = Math.max(margin, maxTop);
      }
    });
  }

  onFlyoutEnter(): void {
    clearTimeout(this.hoverCloseTimeout);
  }

  onMenuLeave(): void {
    this.hoverCloseTimeout = setTimeout(() => {
      this.hoveredMenu = null;
    }, 150);
  }

  isActiveChild(menu: any): boolean {
    const currentUrl = this.router.url;
    // Only match against the menu's own listed children, not a blanket
    // prefix check against menu.url itself — some children (e.g. Orders
    // under Inventory, historically) share a URL prefix with a sibling
    // top-level item that has since been promoted out, and a prefix check
    // here would wrongly light up both at once.
    if (menu?.childMenuItems?.length) {
      return menu.childMenuItems.some((child: any) =>
        currentUrl.startsWith(child?.url),
      );
    }
    return currentUrl.startsWith(menu?.url);
  }

  isMenuExpanded(menu: any): boolean {
    const key = menu?.label;
    if (this.menuOverrides.has(key)) {
      return !!this.menuOverrides.get(key);
    }
    return this.isActiveChild(menu);
  }

  toggleMenu(menu: any, event: Event): void {
    // The chevron sits inside the parent's own routerLink <a> — without
    // this, a click would bubble up and navigate away instead of (or as
    // well as) toggling.
    event.preventDefault();
    event.stopPropagation();
    this.menuOverrides.set(menu?.label, !this.isMenuExpanded(menu));
  }

  scrollToActive() {
    const activeItem = this.menuItems.find((item) =>
      item.nativeElement.classList.contains('active'),
    );

    if (activeItem) {
      activeItem.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }
}
