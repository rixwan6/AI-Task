import { Component, OnInit, ViewChild } from '@angular/core';
import { CreateStandupRequest, Standup } from '../../models/standup.model';
import { StandupService } from '../../services/standup.service';
import { StandupFormComponent } from '../../components/standup-form/standup-form.component';

/**
 * The single smart component: it owns the standup list and every API call.
 * The form and history components below it stay presentational, which keeps
 * state in one place without reaching for a state management library.
 */
@Component({
  selector: 'app-standup-page',
  standalone: false,
  templateUrl: './standup-page.component.html',
  styleUrl: './standup-page.component.scss',
})
export class StandupPageComponent implements OnInit {
  @ViewChild(StandupFormComponent) private formComponent?: StandupFormComponent;

  standups: Standup[] = [];
  loading = false;
  submitting = false;
  loadError: string | null = null;
  submitError: string | null = null;

  constructor(private readonly standupService: StandupService) {}

  ngOnInit(): void {
    this.loadStandups();
  }

  onSubmitted(request: CreateStandupRequest): void {
    this.submitting = true;
    this.submitError = null;

    this.standupService.createStandup(request).subscribe({
      next: (standup) => {
        // Prepend rather than refetch: the API returns the created record and
        // orders newest first, so a round trip would tell us nothing new.
        this.standups = [standup, ...this.standups];
        this.formComponent?.reset();
        this.submitting = false;
      },
      error: (error: Error) => {
        this.submitError = error.message;
        this.submitting = false;
      },
    });
  }

  private loadStandups(): void {
    this.loading = true;
    this.loadError = null;

    this.standupService.getStandups().subscribe({
      next: (standups) => {
        this.standups = standups;
        this.loading = false;
      },
      error: (error: Error) => {
        this.loadError = error.message;
        this.loading = false;
      },
    });
  }
}
