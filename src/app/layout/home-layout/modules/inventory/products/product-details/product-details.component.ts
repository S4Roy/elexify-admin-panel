import {
  DatePipe,
  NgClass,
  NgFor,
  NgIf,
  NgSwitch,
  NgSwitchCase,
  NgSwitchDefault,
  TitleCasePipe,
} from '@angular/common';
import { Component } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { SpecialButtonComponent } from 'app/layout/home-layout/includes/special-button/special-button.component';

@Component({
  selector: 'app-product-details',
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    SpecialButtonComponent,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
  ],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss',
})
export class ProductDetailsComponent {
  product: any;

  constructor(
    private route: ActivatedRoute,
    private title: Title,
    private meta: Meta
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.product = data['product']; // Full API response
      console.log(this.product);
      this.title.setTitle(this.product.meta_title || this.product.name);
      this.meta.updateTag({
        name: 'description',
        content: this.product.meta_description || this.product.description,
      });
      this.meta.updateTag({
        name: 'keywords',
        content: this.product.meta_keywords?.join(', ') || '',
      });
      this.meta.updateTag({ property: 'og:title', content: this.product.name });
      this.meta.updateTag({
        property: 'og:image',
        content: this.product.featuredImage,
      });
      this.meta.updateTag({
        property: 'og:description',
        content: this.product.meta_description,
      });
    });
  }
}
