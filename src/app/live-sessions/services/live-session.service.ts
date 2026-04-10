import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type SessionStatus = 'scheduled' | 'live' | 'ended';
export type SessionPlatform = 'tiktok' | 'facebook' | 'instagram';

export interface LiveSession {
  id?: number;
  title: string;
  description?: string;
  platform: SessionPlatform;
  status: SessionStatus;
  scheduled_at: string;
  started_at?: string;
  ended_at?: string;
  stream_url?: string;
  slug?: string;
  slot?: number;
  payment_qr_image?: string;
  payment_instructions?: string;
  is_active?: boolean;
  is_live?: boolean;
  allow_multiple_cart?: boolean;
  created_at?: string;
}

export interface LiveSessionFilters {
  fecha?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  slot?: number | string;
  estado?: string;
}

export interface Reservation {
  id: number;
  session: number;
  product: number;
  product_name?: string;
  customer_name: string;
  customer_phone: string;
  quantity: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'paid' | 'shipped' | 'recibido' | 'delivered';
  notes?: string;
  variant_detail?: string;
  total_price: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class LiveSessionService {
  private sessionsUrl = `${environment.apiUrl}/livestreams/live-sessions`;
  private reservationsUrl = `${environment.apiUrl}/orders/reservations`;

  constructor(private http: HttpClient) {}

  getSessions(filters?: LiveSessionFilters): Observable<LiveSession[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.fecha)        params = params.set('fecha', filters.fecha);
      if (filters.fecha_inicio) params = params.set('fecha_inicio', filters.fecha_inicio);
      if (filters.fecha_fin)    params = params.set('fecha_fin', filters.fecha_fin);
      if (filters.slot != null) params = params.set('slot', String(filters.slot));
      if (filters.estado)       params = params.set('estado', filters.estado);
    }
    return this.http.get<LiveSession[]>(`${this.sessionsUrl}/`, { params });
  }

  getSession(id: number): Observable<LiveSession> {
    return this.http.get<LiveSession>(`${this.sessionsUrl}/${id}/`);
  }

  createSession(session: Partial<LiveSession> | FormData): Observable<LiveSession> {
    return this.http.post<LiveSession>(`${this.sessionsUrl}/`, session);
  }

  updateSession(id: number, session: Partial<LiveSession> | FormData): Observable<LiveSession> {
    return this.http.patch<LiveSession>(`${this.sessionsUrl}/${id}/`, session);
  }

  startSession(id: number): Observable<LiveSession> {
    return this.http.post<LiveSession>(`${this.sessionsUrl}/${id}/start_session/`, {});
  }

  endSession(id: number): Observable<LiveSession> {
    return this.http.post<LiveSession>(`${this.sessionsUrl}/${id}/end_session/`, {});
  }

  getSessionReservations(sessionId: number): Observable<Reservation[]> {
    const params = new HttpParams()
      .set('session', sessionId.toString())
      .set('page_size', '200');
    return this.http.get<any>(`${this.reservationsUrl}/`, { params }).pipe(
      map(res => Array.isArray(res) ? res : (res.results ?? []))
    );
  }
}
