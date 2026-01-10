import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-router-card',
  imports: [RouterModule],
  templateUrl: './router-card.component.html',
  styleUrl: './router-card.component.scss',
})
export class RouterCardComponent {
  @Input() item: any = null;
}
