import { Component, Input } from '@angular/core';
import { Standup } from '../../models/standup.model';

/**
 * Renders the four states a list can be in — loading, failed, empty, and
 * populated — so the page component does not have to.
 */
@Component({
  selector: 'app-standup-history',
  standalone: false,
  templateUrl: './standup-history.component.html',
  styleUrl: './standup-history.component.scss',
})
export class StandupHistoryComponent {
  @Input() standups: Standup[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;

  /** Keeps existing cards from being re-rendered when a new one is prepended. */
  trackById(_index: number, standup: Standup): string {
    return standup.id;
  }
}
