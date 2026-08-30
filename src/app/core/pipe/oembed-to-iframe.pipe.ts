import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';

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

    // This pipe's only job is to upgrade <oembed>/<iframe> embed tags into
    // real trusted iframe HTML - it must not grant blanket trust to the rest
    // of the (externally-authored, CKEditor-produced) content around them.
    // Extract each embed as a placeholder token first, sanitize everything
    // else through Angular's real HTML sanitizer (which strips <script>,
    // event-handler attributes, javascript: URLs, etc.), then splice the
    // trusted iframe HTML back in by token. Previously the whole string was
    // passed to bypassSecurityTrustHtml() unconditionally, which meant any
    // <script>/onerror payload saved into blog content would execute
    // unsanitized on the blog-details page.
    const embeds: string[] = [];
    const placeholder = (fragment: string) => {
      // Plain-text token with no leading/trailing whitespace, since the
      // sanitizer can trim/collapse whitespace around text-node boundaries.
      const token = '[[[OEMBED_TOKEN_' + embeds.length + ']]]';
      embeds.push(fragment);
      return token;
    };

    let transformed = html;

    // 1) Replace <oembed url="..."></oembed> (handles youtu.be, youtube.com, vimeo)
    transformed = transformed.replace(
      /<oembed\s+url=["']([^"']+)["']\s*><\/oembed>/gi,
      (_match, url: string) => {
        const iframe = this.oembedUrlToIframe(url);
        if (!iframe) return '';
        return placeholder(`<div class="responsive-embed">${iframe}</div>`);
      }
    );

    // 2) Optionally: Replace plain <iframe> src that has youtube/vimeo short url -> convert to embed url
    transformed = transformed.replace(
      /<iframe\b[^>]*src=["']([^"']+)["'][^>]*><\/iframe>/gi,
      (match, src) => {
        // if src is a watch?v= or youtu.be, convert
        const converted = this.oembedUrlToIframe(src);
        // An iframe this pipe doesn't recognize is untrusted third-party
        // markup, not a safe embed - drop it rather than let it through
        // unsanitized (Angular's sanitizer strips <iframe> entirely anyway).
        return converted ? placeholder(`<div class="responsive-embed">${converted}</div>`) : '';
      }
    );

    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, transformed) ?? '';
    const withEmbeds = sanitized.replace(
      /\[\[\[OEMBED_TOKEN_(\d+)\]\]\]/g,
      (_match, index: string) => embeds[Number(index)] ?? ''
    );

    return this.sanitizer.bypassSecurityTrustHtml(withEmbeds);
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
