import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  payment_qr_image?: string;
  payment_instructions?: string;
  is_active?: boolean;
  is_live?: boolean;
  allow_multiple_cart?: boolean;
  created_at?: string;
}

export interface Reservation {
  id: number;
  session: number;
  product: number;
  customer_name: string;
  customer_phone: string;
  quantity: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'paid';
  notes?: string;
  total_price: number;
  created_at: string;
  // Campos enriquecidos del WebSocket
  product_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LiveSessionService {
  private sessionsUrl = `${environment.apiUrl}/livestreams/live-sessions`;
  private reservationsUrl = `${environment.apiUrl}/orders/reservations`;

  constructor(private http: HttpClient) {}

  getSessions(): Observable<LiveSession[]> {
    return this.http.get<LiveSession[]>(`${this.sessionsUrl}/`);
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
    const params = new HttpParams().set('session', sessionId.toString());
    return this.http.get<Reservation[]>(`${this.reservationsUrl}/`, { params });
  }
}
