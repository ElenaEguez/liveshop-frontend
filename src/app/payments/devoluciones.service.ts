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

export interface MetodoPagoOption {
  id: number;
  nombre: string;
  tipo: string;
  activo: boolean;
}

export interface DevolucionPayload {
  venta: number;
  tipo_resolucion: 'devolucion_dinero';
  metodo_pago_devolucion: number;
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
  metodo_pago_devolucion?: number;
  metodo_pago_devolucion_nombre?: string;
  procesado_por_nombre: string;
  created_at: string;
  items: any[];
}

export interface DevolucionesPaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Devolucion[];
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

  getMetodosPago(): Observable<MetodoPagoOption[]> {
    return this.http.get<MetodoPagoOption[]>(
      `${environment.apiUrl}/pos/metodos-pago/`,
    ).pipe(
      map((r) => (Array.isArray(r) ? r : []).filter((m) => m.activo)),
    );
  }

  crearDevolucion(data: DevolucionPayload): Observable<Devolucion> {
    return this.http.post<Devolucion>(
      `${this.base}/devoluciones/`,
      data
    );
  }

  getDevoluciones(params?: {
    page?: number;
    page_size?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
    venta?: number;
  }): Observable<DevolucionesPaginatedResponse> {
    let hp = new HttpParams();
    if (params?.page != null) {
      hp = hp.set('page', String(params.page));
    }
    if (params?.page_size != null) {
      hp = hp.set('page_size', String(params.page_size));
    }
    if (params?.fecha_desde) {
      hp = hp.set('fecha_desde', params.fecha_desde);
    }
    if (params?.fecha_hasta) {
      hp = hp.set('fecha_hasta', params.fecha_hasta);
    }
    if (params?.venta != null) {
      hp = hp.set('venta', String(params.venta));
    }
    return this.http.get<DevolucionesPaginatedResponse>(
      `${this.base}/devoluciones/`,
      { params: hp },
    );
  }
}
