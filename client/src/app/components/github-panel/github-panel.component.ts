import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { GithubCommit, GithubIssue, GithubPullRequest, GithubStatus } from '../../models/github.model';
import { GithubService } from '../../services/github.service';

type Tab = 'commits' | 'pulls' | 'issues';

/**
 * Optional panel showing data pulled from GitHub over MCP.
 *
 * Self-contained on purpose: it fetches its own status and data rather than
 * being fed by the page component. That keeps the standup flow completely
 * unaware of the integration — if this component were deleted, nothing else
 * would change.
 */
@Component({
  selector: 'app-github-panel',
  standalone: false,
  templateUrl: './github-panel.component.html',
  styleUrl: './github-panel.component.scss',
})
export class GithubPanelComponent implements OnInit {
  status: GithubStatus | null = null;
  commits: GithubCommit[] = [];
  pullRequests: GithubPullRequest[] = [];
  issues: GithubIssue[] = [];

  activeTab: Tab = 'commits';
  loading = false;
  error: string | null = null;

  constructor(private readonly githubService: GithubService) {}

  ngOnInit(): void {
    // Status first: it always succeeds, and tells us whether fetching data is
    // even worth attempting.
    this.githubService.getStatus().subscribe({
      next: (status) => {
        this.status = status;
        if (status.enabled && status.connected) {
          this.loadData();
        }
      },
      // A failure here means the API itself is unreachable — the standup panel
      // already reports that, so this one just stays hidden.
      error: () => (this.status = null),
    });
  }

  /** Hidden entirely when switched off, so a disabled feature adds no clutter. */
  get isVisible(): boolean {
    return this.status?.enabled === true;
  }

  get repoLabel(): string {
    return this.status ? `${this.status.owner}/${this.status.repo}` : '';
  }

  selectTab(tab: Tab): void {
    this.activeTab = tab;
  }

  trackByUrl(_index: number, item: { url: string }): string {
    return item.url;
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      commits: this.githubService.getCommits(),
      pullRequests: this.githubService.getPullRequests(),
      issues: this.githubService.getIssues(),
    }).subscribe({
      next: (result) => {
        this.commits = result.commits;
        this.pullRequests = result.pullRequests;
        this.issues = result.issues;
        this.loading = false;
      },
      error: (error: Error) => {
        this.error = error.message;
        this.loading = false;
      },
    });
  }
}
