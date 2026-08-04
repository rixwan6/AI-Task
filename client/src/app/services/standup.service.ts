import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, CreateStandupRequest, Standup } from '../models/standup.model';
import { toReadableError, unwrap } from './api-response.util';

/**
 * The only place that knows the standup API exists.
 *
 * Components receive plain `Standup` objects or a readable `Error` — the
 * response envelope and HTTP status codes are unwrapped here.
 */
@Injectable({ providedIn: 'root' })
export class StandupService {
  private readonly standupsUrl = `${environment.apiBaseUrl}/standups`;

  constructor(private readonly http: HttpClient) {}

  getStandups(): Observable<Standup[]> {
    return this.http
      .get<ApiResponse<Standup[]>>(this.standupsUrl)
      .pipe(map(unwrap), catchError(toReadableError));
  }

  createStandup(request: CreateStandupRequest): Observable<Standup> {
    return this.http
      .post<ApiResponse<Standup>>(this.standupsUrl, request)
      .pipe(map(unwrap), catchError(toReadableError));
  }
}
