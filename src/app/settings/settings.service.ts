import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

export interface TicketConfig {
  id?: number;
  mostrar_logo: boolean;
  nombre_empresa: string;
  ruc_nit: string;
  direccion: string;
  telefono: string;
  texto_pie: string;
  mostrar_qr: boolean;
  moneda: string;
  ancho_ticket: 58 | 80;
}

export interface MetodoPago {
  id: number;
  nombre: string;
  tipo: string;
  icono: string;
  activo: boolean;
  orden: number;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  es_principal: boolean;
  activa: boolean;
  almacenes: { id: number; nombre: string; activo: boolean }[];
}

export interface Caja {
  id: number;
  sucursal: number;
  nombre: string;
  activa: boolean;
}

export interface Cupon {
  id: number;
  codigo: string;
  tipo: 'porcentaje' | 'monto_fijo';
  valor: string;
  usos_maximos: number | null;
  usos_actuales: number;
  fecha_vencimiento: string | null;
  activo: boolean;
  aplica_live: boolean;
  aplica_pos: boolean;
}

export interface Comprobante {
  id: number;
  tipo: string;
  tipo_display: string;
  serie: string;
  correlativo: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private http: HttpClient) {}

  // ── Ticket config ─────────────────────────────────────────────────────────
  getTicketConfig(): Observable<TicketConfig> {
    return this.http.get<TicketConfig>(`${API}/branches/ticket-config/`);
  }

  saveTicketConfig(config: Partial<TicketConfig>): Observable<TicketConfig> {
    return this.http.patch<TicketConfig>(`${API}/branches/ticket-config/`, config);
  }

  // ── Métodos de pago ───────────────────────────────────────────────────────
  getMetodosPago(): Observable<MetodoPago[]> {
    return this.http.get<MetodoPago[]>(`${API}/pos/metodos-pago/`);
  }

  createMetodoPago(payload: Partial<MetodoPago>): Observable<MetodoPago> {
    return this.http.post<MetodoPago>(`${API}/pos/metodos-pago/`, payload);
  }

  updateMetodoPago(id: number, payload: Partial<MetodoPago>): Observable<MetodoPago> {
    return this.http.patch<MetodoPago>(`${API}/pos/metodos-pago/${id}/`, payload);
  }

  deleteMetodoPago(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/pos/metodos-pago/${id}/`);
  }

  // ── Sucursales ────────────────────────────────────────────────────────────
  getSucursales(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${API}/branches/sucursales/`);
  }

  createSucursal(payload: Partial<Sucursal>): Observable<Sucursal> {
    return this.http.post<Sucursal>(`${API}/branches/sucursales/`, payload);
  }

  updateSucursal(id: number, payload: Partial<Sucursal>): Observable<Sucursal> {
    return this.http.patch<Sucursal>(`${API}/branches/sucursales/${id}/`, payload);
  }

  deleteSucursal(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/branches/sucursales/${id}/`);
  }

  getCajas(sucursalId: number): Observable<Caja[]> {
    return this.http.get<Caja[]>(`${API}/branches/sucursales/${sucursalId}/cajas/`);
  }

  createCaja(sucursalId: number, nombre: string): Observable<Caja> {
    return this.http.post<Caja>(`${API}/branches/sucursales/${sucursalId}/cajas/`, { nombre });
  }

  deleteCaja(sucursalId: number, cajaId: number): Observable<void> {
    return this.http.delete<void>(`${API}/branches/sucursales/${sucursalId}/cajas/${cajaId}/`);
  }

  createAlmacen(sucursalId: number, nombre: string): Observable<any> {
    return this.http.post<any>(`${API}/branches/almacenes/`, { sucursal: sucursalId, nombre });
  }

  deleteAlmacen(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/branches/almacenes/${id}/`);
  }

  // ── Cupones ───────────────────────────────────────────────────────────────
  getCupones(): Observable<Cupon[]> {
    return this.http.get<Cupon[]>(`${API}/cupones/`);
  }

  createCupon(payload: Partial<Cupon>): Observable<Cupon> {
    return this.http.post<Cupon>(`${API}/cupones/`, payload);
  }

  updateCupon(id: number, payload: Partial<Cupon>): Observable<Cupon> {
    return this.http.patch<Cupon>(`${API}/cupones/${id}/`, payload);
  }

  deleteCupon(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/cupones/${id}/`);
  }

  // ── Comprobantes ──────────────────────────────────────────────────────────
  getComprobantes(): Observable<Comprobante[]> {
    return this.http.get<Comprobante[]>(`${API}/branches/comprobantes/`);
  }

  updateComprobante(id: number, payload: Partial<Comprobante>): Observable<Comprobante> {
    return this.http.patch<Comprobante>(`${API}/branches/comprobantes/${id}/`, payload);
  }
}
