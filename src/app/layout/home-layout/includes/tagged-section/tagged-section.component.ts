import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-tagged-section',
  imports: [MatCheckboxModule],
  templateUrl: './tagged-section.component.html',
  styleUrl: './tagged-section.component.scss',
})
export class TaggedSectionComponent {
  section_list: any = [];
  constructor() {
    this.section_list = [
      {
        id: 1,
        name: 'News and Events Section',
      },
      {
        id: 2,
        name: 'Our Team and Partners Section',
      },
      {
        id: 3,
        name: 'FAQ’s Section',
      },
      {
        id: 4,
        name: 'Team Members Section',
      },
      {
        id: 5,
        name: 'Media and Gallery Section',
      },
      {
        id: 6,
        name: 'Clientele Section',
      },
      {
        id: 7,
        name: 'Add a Contact Form',
      },
    ];
  }
}
