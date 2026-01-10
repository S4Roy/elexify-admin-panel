import {
  Directive,
  ElementRef,
  Input,
  Renderer2,
  AfterViewInit,
} from '@angular/core';

@Directive({
  selector: '[appReadMoreClamp]',
})
export class ReadMoreClampDirective implements AfterViewInit {
  @Input('appReadMoreClamp') charLimit = 100;
  @Input() readMoreLabel = 'Read More';
  @Input() readLessLabel = 'Read Less';

  private originalText: string = '';
  private isExpanded = false;
  private textSpan!: HTMLElement;
  private toggleBtn!: HTMLElement;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngAfterViewInit(): void {
    this.originalText = this.el.nativeElement.innerText.trim();

    if (this.originalText.length > this.charLimit) {
      this.setupInline();
      this.applyClamp();
    }
  }

  private setupInline(): void {
    // Clear the host element
    this.el.nativeElement.innerHTML = '';

    // Text container span
    this.textSpan = this.renderer.createElement('span');
    this.renderer.appendChild(this.el.nativeElement, this.textSpan);

    // Toggle button
    this.toggleBtn = this.renderer.createElement('button');
    this.setButtonStyles();
    this.renderer.appendChild(this.el.nativeElement, this.toggleBtn);

    this.renderer.listen(this.toggleBtn, 'click', () => {
      this.isExpanded = !this.isExpanded;
      this.applyClamp();
      this.updateToggleText();
    });
  }

  private applyClamp(): void {
    if (this.isExpanded) {
      this.textSpan.innerText = this.originalText + ' ';
    } else {
      const truncated = this.originalText.substring(0, this.charLimit) + '... ';
      this.textSpan.innerText = truncated;
    }
    this.updateToggleText();
  }

  private updateToggleText(): void {
    this.toggleBtn.innerText = this.isExpanded
      ? this.readLessLabel
      : this.readMoreLabel;
  }

  private setButtonStyles(): void {
    this.renderer.setStyle(this.toggleBtn, 'background', 'transparent');
    this.renderer.setStyle(this.toggleBtn, 'border', 'none');
    this.renderer.setStyle(this.toggleBtn, 'color', '#2563eb');
    this.renderer.setStyle(this.toggleBtn, 'cursor', 'pointer');
    this.renderer.setStyle(this.toggleBtn, 'padding', '0');
    this.renderer.setStyle(this.toggleBtn, 'fontSize', '14px');
    this.renderer.setStyle(this.toggleBtn, 'fontWeight', '500');
  }
}
