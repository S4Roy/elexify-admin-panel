import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
      selector: 'app-thumbnail',
  imports: [NgIf],
  templateUrl: './thumbnail.component.html',
  styleUrl: './thumbnail.component.scss'
})
export class ThumbnailComponent {
  @Input() isFirstCondition: boolean = true;
}
