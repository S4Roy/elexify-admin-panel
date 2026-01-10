import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'oembedToIframe',
  pure: true,
})
export class OembedToIframePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(html: string | null | undefined): SafeHtml | null {
    if (!html) {
      return null;
    }

    let transformed = html;

    // 1) Replace <oembed url="..."></oembed> (handles youtu.be, youtube.com, vimeo)
    transformed = transformed.replace(
      /<oembed\s+url=["']([^"']+)["']\s*><\/oembed>/gi,
      (_match, url: string) => {
        const iframe = this.oembedUrlToIframe(url);
        // wrap iframe in a responsive container (optional)
        return `<div class="responsive-embed">${iframe}</div>`;
      }
    );

    // 2) Optionally: Replace plain <iframe> src that has youtube/vimeo short url -> convert to embed url
    transformed = transformed.replace(
      /<iframe\b[^>]*src=["']([^"']+)["'][^>]*><\/iframe>/gi,
      (match, src) => {
        // if src is a watch?v= or youtu.be, convert
        const converted = this.oembedUrlToIframe(src);
        return converted
          ? `<div class="responsive-embed">${converted}</div>`
          : match;
      }
    );

    // sanitize and return
    return this.sanitizer.bypassSecurityTrustHtml(transformed);
  }

  private oembedUrlToIframe(url: string): string | null {
    try {
      const u = new URL(url);
      const host = u.hostname.replace('www.', '').toLowerCase();

      // YouTube short link e.g. youtu.be/VIDEOID
      if (host === 'youtu.be') {
        const vid = u.pathname.replace(/^\/+/, '');
        if (vid) {
          return this.buildIframe(`https://www.youtube.com/embed/${vid}`);
        }
      }

      // YouTube full link e.g. youtube.com/watch?v=VIDEOID
      if (
        host === 'youtube.com' ||
        host === 'm.youtube.com' ||
        host === 'youtube-nocookie.com'
      ) {
        const vid = u.searchParams.get('v');
        if (vid) {
          return this.buildIframe(`https://www.youtube.com/embed/${vid}`);
        }
        // sometimes /embed/VIDEOID is already present:
        const pathParts = u.pathname.split('/');
        const embedIndex = pathParts.indexOf('embed');
        if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
          return this.buildIframe(
            `https://www.youtube.com/embed/${pathParts[embedIndex + 1]}`
          );
        }
      }

      // Vimeo e.g. vimeo.com/123456
      if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
        const vid = u.pathname.replace(/^\/+/, '');
        if (vid) {
          return this.buildIframe(`https://player.vimeo.com/video/${vid}`);
        }
      }

      // If URL already looks like an embed iframe src, use as-is
      if (
        url.includes('youtube.com/embed') ||
        url.includes('player.vimeo.com')
      ) {
        return this.buildIframe(url);
      }

      // Unknown host — return null so original content is left untouched
      return null;
    } catch (e) {
      return null;
    }
  }

  private buildIframe(src: string): string {
    // You can tweak width/height, allow attributes, etc.
    return `<iframe
      width="560" height="315"
      src="${this.escapeAttr(src)}"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen>
    </iframe>`;
  }

  private escapeAttr(s: string): string {
    return s
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
