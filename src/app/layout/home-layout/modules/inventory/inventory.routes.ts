import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { CategoriesComponent } from './categories/categories.component';
import { HomeLayoutComponent } from '../../home-layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { BlankLayoutComponent } from '../../includes/blank-layout/blank-layout.component';
import { ProductsComponent } from './products/products.component';
import { ProductDetailsComponent } from './products/product-details/product-details.component';
import { productNameResolver } from './resolver/product-name.resolver';
import { BrandsComponent } from './brands/brands.component';
import { NewProductComponent } from './products/new-product/new-product.component';
import { AttributesComponent } from './attributes/attributes.component';
import { PickOrderComponent } from './orders/pick-order/pick-order.component';
import { OrderDetailsComponent } from './orders/order-details/order-details.component';
import { OrdersComponent } from './orders/orders.component';
import { TagsComponent } from './tags/tags.component';
import { ClassificationComponent } from './classification/classification.component';
import { NewCategoryComponent } from './categories/new-category/new-category.component';
import { CouponsComponent } from './coupons/coupons.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeLayoutComponent,
    data: { pageTitle: '', breadcrumb: 'inventory' },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: { pageTitle: 'Dashboard', breadcrumb: 'dashboard' },
      },
      {
        path: 'attributes',
        component: BlankLayoutComponent,
        data: { pageTitle: 'Attributes', breadcrumb: 'attributes' },
        children: [
          {
            path: '',
            redirectTo: '',
            pathMatch: 'full',
          },
          {
            path: '',
            component: AttributesComponent,
            data: { pageTitle: 'Attributes', breadcrumb: '' },
          },
          {
            path: ':slug',
            component: AttributesComponent,
            data: {
              pageTitle: 'Attributes',
              breadcrumb: (data: any, route: ActivatedRouteSnapshot) =>
                route.paramMap.get('slug')?.replace(/-/g, ' ') ?? 'attributes',
            },
          },
        ],
      },
      {
        path: 'brands',
        component: BlankLayoutComponent,
        data: { pageTitle: 'Categories', breadcrumb: 'brands' },
        children: [
          {
            path: '',
            redirectTo: '',
            pathMatch: 'full',
          },
          {
            path: '',
            component: BrandsComponent,
            data: { pageTitle: 'Brands', breadcrumb: '' },
          },
          {
            path: ':slug',
            component: BrandsComponent,
            data: {
              pageTitle: 'Brands',
              breadcrumb: (data: any, route: ActivatedRouteSnapshot) =>
                route.paramMap.get('slug')?.replace(/-/g, ' ') ?? 'brands',
            },
          },
        ],
      },
      {
        path: 'tags',
        component: BlankLayoutComponent,
        data: { pageTitle: 'Tags', breadcrumb: 'tags' },
        children: [
          {
            path: '',
            redirectTo: '',
            pathMatch: 'full',
          },
          {
            path: '',
            component: TagsComponent,
            data: { pageTitle: 'Tags', breadcrumb: '' },
          },
          {
            path: ':slug',
            component: TagsComponent,
            data: {
              pageTitle: 'Tags',
              breadcrumb: (data: any, route: ActivatedRouteSnapshot) =>
                route.paramMap.get('slug')?.replace(/-/g, ' ') ?? 'tags',
            },
          },
        ],
      },
      {
        path: 'classification',
        component: BlankLayoutComponent,
        data: { pageTitle: 'Classification', breadcrumb: 'classification' },
        children: [
          {
            path: '',
            redirectTo: '',
            pathMatch: 'full',
          },
          {
            path: '',
            component: ClassificationComponent,
            data: { pageTitle: 'Classification', breadcrumb: '' },
          },
          {
            path: ':slug',
            component: ClassificationComponent,
            data: {
              pageTitle: 'Classification',
              breadcrumb: (data: any, route: ActivatedRouteSnapshot) =>
                route.paramMap.get('slug')?.replace(/-/g, ' ') ??
                'classification',
            },
          },
        ],
      },
      {
        path: 'categories',
        component: BlankLayoutComponent,
        data: { pageTitle: 'Categories', breadcrumb: 'categories' },
        children: [
          {
            path: '',
            component: CategoriesComponent,
            data: { pageTitle: 'Categories', breadcrumb: '' },
          },
          {
            path: 'add',
            component: NewCategoryComponent,
            data: { pageTitle: 'Add Category', breadcrumb: 'Add' },
          },
          {
            path: 'update/:_id',
            component: NewCategoryComponent,
            data: { pageTitle: 'Update Category', breadcrumb: 'Update' },
          },
          {
            path: ':slug',
            component: CategoriesComponent,
            data: {
              pageTitle: 'Categories',
              breadcrumb: (data: any, route: ActivatedRouteSnapshot) =>
                route.paramMap.get('slug')?.replace(/-/g, ' ') ?? 'Category',
            },
          },
        ],
      },
      {
        path: 'products',
        component: BlankLayoutComponent,
        data: { pageTitle: 'Products', breadcrumb: 'products' },
        children: [
          {
            path: '',
            redirectTo: '',
            pathMatch: 'full',
          },
          {
            path: '',
            component: ProductsComponent,
            data: { pageTitle: 'Products', breadcrumb: '' },
          },
          {
            path: 'add',
            component: NewProductComponent,
            data: { pageTitle: 'Add Product', breadcrumb: 'New Product' },
          },
          {
            path: 'update/:_id',
            component: NewProductComponent,
            data: { pageTitle: 'Update Product', breadcrumb: 'Update Product' },
          },
          {
            path: 'details/:slug',
            component: ProductDetailsComponent,
            resolve: {
              product: productNameResolver,
            },
            data: {
              pageTitle: 'Products',
              breadcrumb: (data: any) => data.product.name, // Gets name from resolver
            },
          },
          {
            path: ':slug',
            component: ProductsComponent,
            data: {
              pageTitle: 'Products',
              breadcrumb: (data: any, route: ActivatedRouteSnapshot) =>
                route.paramMap.get('slug')?.replace(/-/g, ' ') ?? 'Product',
            },
          },
        ],
      },
      {
        path: 'orders',
        component: BlankLayoutComponent,
        data: { pageTitle: 'Orders', breadcrumb: 'Orders' },
        children: [
          {
            path: '',
            redirectTo: '',
            pathMatch: 'full',
          },
          {
            path: '',
            component: OrdersComponent,
            data: { pageTitle: 'Orders', breadcrumb: '' },
          },
          {
            path: 'details/:_id',
            component: OrderDetailsComponent,
            data: {
              pageTitle: 'Order Details',
              breadcrumb: 'Details',
            },
          },
          {
            path: ':order_status',
            component: OrdersComponent,
            data: {
              pageTitle: (data: any, route: ActivatedRouteSnapshot) => {
                const status = route.paramMap.get('order_status') ?? '';
                const formattedStatus = status
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (char) => char.toUpperCase());
                return `Orders - ${formattedStatus}`;
              },
              breadcrumb: (data: any, route: ActivatedRouteSnapshot) => {
                const status = route.paramMap.get('order_status') ?? '';
                return status
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (char) => char.toUpperCase());
              },
            },
          },
          {
            path: ':order_status',
            component: BlankLayoutComponent,
            data: {
              pageTitle: (data: any, route: ActivatedRouteSnapshot) => {
                const status = route.paramMap.get('order_status') ?? '';
                const formattedStatus = status
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (char) => char.toUpperCase());
                return `Orders - ${formattedStatus}`;
              },
              breadcrumb: (data: any, route: ActivatedRouteSnapshot) => {
                const status = route.paramMap.get('order_status') ?? '';
                return status
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (char) => char.toUpperCase());
              },
            },
            children: [
              {
                path: ':_id',
                component: PickOrderComponent,
                data: {
                  pageTitle: 'Order - Pick Order',
                  breadcrumb: 'Pick Order',
                },
              },
            ],
          },
        ],
      },
      {
        path: 'coupons',
        component: BlankLayoutComponent,
        data: { pageTitle: 'Coupons', breadcrumb: 'Coupons' },
        children: [
          {
            path: '',
            redirectTo: '',
            pathMatch: 'full',
          },
          {
            path: '',
            component: CouponsComponent,
            data: { pageTitle: 'Coupons', breadcrumb: '' },
          },
        ],
      },
    ],
  },
];
