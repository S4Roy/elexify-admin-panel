import { DatePipe, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OembedToIframePipe } from 'app/core/pipe/oembed-to-iframe.pipe';
import { ApiService } from 'app/core/services/api.service';

@Component({
  selector: 'app-blog-details',
  imports: [NgIf, DatePipe, OembedToIframePipe],
  templateUrl: './blog-details.component.html',
  styleUrl: './blog-details.component.scss',
})
export class BlogDetailsComponent {
  blogData: any = null;
  slug: any = null;
  constructor(private apiService: ApiService, private route: ActivatedRoute) {}
  ngOnInit() {
    this.route.paramMap.subscribe((params: any) => {
      this.slug = params.get('slug');
      if (this.slug) {
        this.fetchBlogDetails();
      }
    });
  }
  fetchBlogDetails() {
    let params = new URLSearchParams();
    params.set('slug', this.slug);
    this.apiService.blogList(params).subscribe({
      next: (res: any) => {
        this.blogData = res?.data;
      },
      error: (err) => {},
    });
  }
}
