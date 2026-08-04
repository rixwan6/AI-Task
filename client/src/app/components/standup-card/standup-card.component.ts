import { Component, Input } from '@angular/core';
import { Standup } from '../../models/standup.model';

@Component({
  selector: 'app-standup-card',
  standalone: false,
  templateUrl: './standup-card.component.html',
  styleUrl: './standup-card.component.scss',
})
export class StandupCardComponent {
  @Input({ required: true }) standup!: Standup;
}
