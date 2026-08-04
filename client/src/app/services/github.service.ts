import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { GithubCommit, GithubIssue, GithubPullRequest, GithubStatus } from '../models/github.model';
import { ApiResponse } from '../models/standup.model';
import { toReadableError, unwrap } from './api-response.util';

/**
 * Reads the optional GitHub MCP endpoints.
 *
 * `getStatus()` is the gate: it always succeeds and reports whether the
 * integration is on, so the UI can decide whether to render anything before
 * requesting data that might legitimately be unavailable.
 */
@Injectable({ providedIn: 'root' })
export class GithubService {
  private readonly baseUrl = `${environment.apiBaseUrl}/github`;

  constructor(private readonly http: HttpClient) {}

  getStatus(): Observable<GithubStatus> {
    return this.get<GithubStatus>('status');
  }

  getCommits(limit = 5): Observable<GithubCommit[]> {
    return this.get<GithubCommit[]>(`commits?limit=${limit}`);
  }

  getPullRequests(limit = 5): Observable<GithubPullRequest[]> {
    return this.get<GithubPullRequest[]>(`pull-requests?limit=${limit}`);
  }

  getIssues(limit = 5): Observable<GithubIssue[]> {
    return this.get<GithubIssue[]>(`issues?limit=${limit}`);
  }

  private get<T>(path: string): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${this.baseUrl}/${path}`)
      .pipe(map(unwrap), catchError(toReadableError));
  }
}
