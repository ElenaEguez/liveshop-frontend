import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PermisosModulo {
  ver: boolean;
  operar: boolean;
}

export interface MisPermisos {
  rol: 'superadmin' | 'propietario' | 'miembro';
  vendor_id: number | null;
  vendor_nombre: string | null;
  estado_suscripcion: string;
  permisos: Record<string, PermisosModulo>;
  es_propietario: boolean;
  max_usuarios: number | null;
  usuarios_activos: number | null;
}

@Injectable({ providedIn: 'root' })
export class PermisosService {

  private permisosSubject = new BehaviorSubject<MisPermisos | null>(null);
  permisos$ = this.permisosSubject.asObservable();

  constructor(private http: HttpClient) {}

  cargarPermisos(): Observable<MisPermisos> {
    return this.http
      .get<MisPermisos>(`${environment.apiUrl}/vendors/mis-permisos/`)
      .pipe(tap(p => this.permisosSubject.next(p)));
  }

  get permisos(): MisPermisos | null {
    return this.permisosSubject.getValue();
  }

  /**
   * Verifica si el usuario puede acceder a un módulo.
   * Propietario y superadmin siempre retornan true.
   */
  puede(modulo: string, accion: 'ver' | 'operar' = 'ver'): boolean {
    const p = this.permisos;
    if (!p) return false;
    if (p.rol === 'superadmin' || p.es_propietario) return true;
    if (modulo === 'team' && (p.permisos?.['manage_roles']?.[accion] ?? false)) return true;
    return p.permisos?.[modulo]?.[accion] ?? false;
  }

  get suscripcionActiva(): boolean {
    const p = this.permisos;
    if (!p) return false;
    return ['activo', 'prueba'].includes(p.estado_suscripcion);
  }

  limpiar(): void {
    this.permisosSubject.next(null);
  }
}
