import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CustomRole {
  id: number;
  name: string;
  perm_products: boolean;
  perm_categories: boolean;
  perm_inventory: boolean;
  perm_live_sessions: boolean;
  perm_my_store: boolean;
  perm_orders: boolean;
  perm_payments: boolean;
  perm_team: boolean;
  perm_dashboard: boolean;
  perm_pos: boolean;
  perm_warehouse: boolean;
  perm_expenses: boolean;
  created_at: string;
}

export interface TeamMember {
  id: number;
  user: number;
  user_email: string;
  user_name: string;
  custom_role: number | null;
  custom_role_name: string | null;
  is_active: boolean;
  invited_at: string;
}

export interface InvitePayload {
  email: string;
  nombre?: string;
  apellido?: string;
  custom_role?: number | null;
  password?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private teamUrl  = '/api/v1/vendors/team/';
  private rolesUrl = '/api/v1/vendors/roles/';

  constructor(private http: HttpClient) {}

  // ── Members ──────────────────────────────────────────────
  getTeam(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(this.teamUrl);
  }

  invite(payload: InvitePayload): Observable<TeamMember> {
    return this.http.post<TeamMember>(this.teamUrl, payload);
  }

  updateMember(id: number, data: Partial<Pick<TeamMember, 'custom_role' | 'is_active'>>): Observable<TeamMember> {
    return this.http.patch<TeamMember>(`${this.teamUrl}${id}/`, data);
  }

  removeMember(id: number): Observable<void> {
    return this.http.delete<void>(`${this.teamUrl}${id}/`);
  }

  // ── Custom roles ──────────────────────────────────────────
  getRoles(): Observable<CustomRole[]> {
    return this.http.get<CustomRole[]>(this.rolesUrl);
  }

  createRole(data: Omit<CustomRole, 'id' | 'created_at'>): Observable<CustomRole> {
    return this.http.post<CustomRole>(this.rolesUrl, data);
  }

  updateRole(id: number, data: Partial<Omit<CustomRole, 'id' | 'created_at'>>): Observable<CustomRole> {
    return this.http.patch<CustomRole>(`${this.rolesUrl}${id}/`, data);
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.rolesUrl}${id}/`);
  }
}
