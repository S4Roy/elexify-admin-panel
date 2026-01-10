import { Injectable } from '@angular/core';
import {
  DomSanitizer,
  SafeHtml,
  SafeResourceUrl,
  SafeUrl,
} from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class SanitizeService {
  constructor(private sanitizer: DomSanitizer) {}

  safeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  safeResourceUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;
    try {
      // 🧩 Normalize YouTube URLs to embed form
      if (url.includes('youtube.com/watch?v=')) {
        const videoId = new URL(url).searchParams.get('v');
        if (videoId) {
          url = `https://www.youtube.com/embed/${videoId}`;
        }
      } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1];
        if (videoId) {
          url = `https://www.youtube.com/embed/${videoId}`;
        }
      }

      // Whitelist check
      const parsed = new URL(url, window.location.origin);
      const allowedHosts = ['youtube.com', 'youtu.be', 'vimeo.com'];
      if (!allowedHosts.some((d) => parsed.hostname.includes(d))) {
        console.warn('Blocked iframe domain:', parsed.hostname);
        return null;
      }

      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } catch {
      return null;
    }
  }

  safeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
}
