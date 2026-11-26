import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PermisosService } from '../core/services/permisos.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  /** Una sola renovación aunque el initializer y el guard arranquen juntos. */
  private refreshInFlight: Observable<boolean> | null = null;

  constructor(
    private http: HttpClient,
    private permisosService: PermisosService,
  ) { }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login/`, credentials).pipe(
      tap((response: any) => {
        if (response?.tokens?.access) {
          localStorage.setItem('access_token', response.tokens.access);
          localStorage.setItem('refresh_token', response.tokens.refresh);
        }
        this.refreshInFlight = null;
      }),
      switchMap(() => this.permisosService.cargarPermisos())
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.refreshInFlight = null;
    this.permisosService.limpiar();
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post(`${this.apiUrl}/refresh/`, { refresh: refreshToken }).pipe(
      tap((response: any) => {
        if (response?.access) {
          localStorage.setItem('access_token', response.access);
        }
      }),
    );
  }

  /**
   * Restaura la sesión antes de que un guard decida.
   * Access vigente → sigue. Access vencido y refresh vigente → renueva.
   * Ambos vencidos o ilegibles → limpia y devuelve false.
   */
  ensureSession(): Observable<boolean> {
    const access = localStorage.getItem('access_token');
    if (access && !this.isTokenExpired(access)) {
      return of(true);
    }

    const refresh = localStorage.getItem('refresh_token');
    if (!refresh || this.isTokenExpired(refresh)) {
      if (access || refresh) {
        this.logout();
      }
      return of(false);
    }

    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refreshToken().pipe(
        map(() => true),
        catchError(() => {
          this.logout();
          return of(false);
        }),
        finalize(() => {
          this.refreshInFlight = null;
        }),
        shareReplay(1),
      );
    }
    return this.refreshInFlight;
  }

  /** JWT payload is base64url; atob() rejects '-' and '_'. */
  private decodePayload(token: string): any | null {
    try {
      const part = token.split('.')[1];
      if (!part) {
        return null;
      }
      let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      if (pad) {
        b64 += '='.repeat(4 - pad);
      }
      return JSON.parse(atob(b64));
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodePayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      return true;
    }
    return Date.now() >= payload.exp * 1000;
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return token ? !this.isTokenExpired(token) : false;
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getTokenPayload(): any {
    const token = this.getToken();
    if (!token) return null;
    return this.decodePayload(token);
  }
}

export function restoreSessionFactory(auth: AuthService): () => Promise<boolean> {
  return () => auth.ensureSession().toPromise().then(ok => ok === true);
}
