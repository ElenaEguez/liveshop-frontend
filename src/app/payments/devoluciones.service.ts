import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface VentaItemParaDevolucion {
  id: number;
  producto_id: number;
  producto_nombre: string;
  variante_id: number | null;
  variante_detalle: {
    talla: string;
    color: string;
    color_hex: string;
  } | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  cantidad_devuelta: number;
  cantidad_disponible?: number;
  cantidad_a_devolver?: number;
  seleccionado?: boolean;
}

export interface VentaParaDevolucion {
  id: number;
  numero_ticket: string;
  total: number;
  descuento: number;
  status: string;
  cliente: { nombre: string; telefono: string };
  created_at: string;
  items: VentaItemParaDevolucion[];
}

export interface DevolucionItem {
  venta_item: number;
  cantidad: number;
}

export interface DevolucionPayload {
  venta: number;
  tipo_resolucion: 'cambio' | 'devolucion_dinero';
  motivo: string;
  items: DevolucionItem[];
}

export interface Devolucion {
  id: number;
  venta: number;
  venta_ticket: string;
  venta_total: number;
  tipo: 'total' | 'parcial';
  tipo_resolucion: string;
  motivo: string;
  monto_devuelto: number;
  procesado_por_nombre: string;
  created_at: string;
  items: any[];
}

@Injectable({ providedIn: 'root' })
export class DevolucionesService {
  private base = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  buscarVentaPorTicket(ticket: string): Observable<VentaParaDevolucion> {
    const params = new HttpParams().set('ticket', ticket);
    return this.http.get<VentaParaDevolucion>(
      `${this.base}/devoluciones/buscar-venta/`,
      { params }
    );
  }

  buscarVentaPorId(id: number): Observable<VentaParaDevolucion> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<VentaParaDevolucion>(
      `${this.base}/devoluciones/buscar-venta/`,
      { params }
    );
  }

  crearDevolucion(data: DevolucionPayload): Observable<Devolucion> {
    return this.http.post<Devolucion>(
      `${this.base}/devoluciones/`,
      data
    );
  }

  getDevoluciones(): Observable<Devolucion[]> {
    return this.http
      .get<any>(`${this.base}/devoluciones/`)
      .pipe(map((r) => (Array.isArray(r) ? r : r.results || [])));
  }
}
