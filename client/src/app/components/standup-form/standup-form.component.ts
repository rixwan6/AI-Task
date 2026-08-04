import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { CreateStandupRequest } from '../../models/standup.model';

/** Matches the server's own cap, so the client rejects it first. */
const MAX_LENGTH = 2000;

interface StandupFormControls {
  yesterday: FormControl<string>;
  today: FormControl<string>;
  blockers: FormControl<string>;
}

/**
 * Presentational form. It validates and emits, but never talks to the API —
 * the page component owns submission so there is one place that knows how a
 * standup gets created.
 */
@Component({
  selector: 'app-standup-form',
  standalone: false,
  templateUrl: './standup-form.component.html',
  styleUrl: './standup-form.component.scss',
})
export class StandupFormComponent {
  /** Driven by the parent so the button reflects the real request state. */
  @Input() submitting = false;

  @Output() submitted = new EventEmitter<CreateStandupRequest>();

  readonly maxLength = MAX_LENGTH;
  readonly form: FormGroup<StandupFormControls>;

  // Built in the constructor rather than as a field initialiser so it cannot
  // depend on class-field evaluation order relative to injected dependencies.
  constructor(private readonly formBuilder: FormBuilder) {
    this.form = this.formBuilder.nonNullable.group({
      yesterday: ['', [notBlank, Validators.maxLength(MAX_LENGTH)]],
      today: ['', [notBlank, Validators.maxLength(MAX_LENGTH)]],
      blockers: ['', [Validators.maxLength(MAX_LENGTH)]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      // Reveal every message at once rather than only the fields touched.
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit(this.form.getRawValue());
  }

  /** Called by the parent after a successful save. */
  reset(): void {
    this.form.reset();
  }

  showError(controlName: keyof StandupFormControls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  errorMessage(controlName: keyof StandupFormControls, label: string): string {
    const control = this.form.controls[controlName];

    if (control.hasError('notBlank')) {
      return `${label} is required.`;
    }
    if (control.hasError('maxlength')) {
      return `${label} must be ${MAX_LENGTH} characters or fewer.`;
    }
    return '';
  }
}

/**
 * `Validators.required` treats a whitespace-only string as present, so it
 * would pass here and then be rejected by the server. This checks the trimmed
 * value instead.
 */
function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value?.trim() ? null : { notBlank: true };
}
