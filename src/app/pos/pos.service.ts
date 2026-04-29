import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  es_principal: boolean;
  activa: boolean;
}

export interface Caja {
  id: number;
  nombre: string;
  activa: boolean;
  sucursal: number;
}

export interface TurnoCaja {
  id: number;
  caja: number;
  usuario?: number | null;
  caja_nombre?: string;
  sucursal_nombre?: string;
  usuario_nombre?: string;
  usuario_email?: string;
  status: 'abierto' | 'cerrado';
  monto_apertura: string;
  monto_cierre: string | null;
  efectivo_esperado: string | null;
  diferencia_cierre: string | null;
  fecha_apertura: string;
  fecha_cierre: string | null;
  total_ventas: string;
  notas_cierre?: string;
  metodos_pago?: { [nombre: string]: { monto: number; cantidad: number } };
}

export interface MetodoPago {
  id: number;
  nombre: string;
  tipo: string;
  icono: string;
  activo: boolean;
  orden: number;
}

export interface ProductVariantPOS {
  id: number;
  talla: string;
  color: string;
  color_hex: string;
  sku: string;
  stock_extra: number;
  is_active: boolean;
}

export interface ProductoPOS {
  id: number;
  name: string;
  barcode: string;
  internal_code: string;
  price: number;
  purchase_cost: number | null;
  stock_disponible: number;
  sell_by: string[];
  variantes: ProductVariantPOS[];
  imagen_thumbnail: string | null;
}

export interface ScanResult {
  match: 'exact' | 'partial' | 'none';
  product?: ProductoPOS;
  products?: ProductoPOS[];
}

export interface CartItem {
  product: ProductoPOS;
  variant: ProductVariantPOS | null;
  cantidad: number;
  precio_unitario: number;
  descuento_unitario: number;  // descuento por unidad en Bs.
  unidad: string;              // unidad de venta seleccionada (de sell_by)
}

export interface VentaPOSItem {
  id: number;
  product: number;
  product_name: string;
  variant: number | null;
  cantidad: number;
  precio_unitario: string;
  costo_unitario: string | null;
  subtotal: string;
}

export interface VentaPOS {
  id: number;
  numero_ticket: string;
  vendor: number;
  sucursal: number;
  sucursal_nombre: string;
  caja: number | null;
  turno: number | null;
  cliente_nombre: string;
  cliente_telefono: string;
  metodo_pago: number | null;
  metodo_pago_nombre: string | null;
  subtotal: string;
  descuento: string;
  discount_percentage: string | null;
  discount_type: string | null;
  canal_venta: string;
  direccion_envio: string | null;
  total: string;
  monto_recibido: string | null;
  vuelto: string | null;
  cupon: number | null;
  status: 'completada' | 'anulada' | 'credito';
  usuario: number | null;
  usuario_nombre?: string;
  es_credito: boolean;
  plazo_dias: number | null;
  fecha_vencimiento_credito: string | null;
  notas: string;
  created_at: string;
  items: VentaPOSItem[];
  monto_pagado: string;
  saldo_pendiente: string;
  monto_cobrado?: string;
}

export interface PagoCredito {
  id: number;
  monto: string;
  metodo_pago: number | null;
  metodo_pago_nombre: string | null;
  notas: string;
  usuario_nombre: string;
  created_at: string;
}

export interface VentaPOSCreatePayload {
  sucursal_id: number;
  caja_id?: number | null;
  turno_id?: number | null;
  cliente_nombre?: string;
  cliente_telefono?: string;
  metodo_pago_id?: number | null;
  items: { product_id: number; variant_id?: number | null; cantidad: number; precio_unitario: number }[];
  descuento?: number;
  discount_percentage?: number | null;
  discount_type?: string | null;
  canal_venta?: string;
  direccion_envio?: string | null;
  cupon_codigo?: string | null;
  monto_recibido?: number | null;
  es_credito?: boolean;
  plazo_dias?: number | null;
  notas?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TotalMetodo {
  tipo: string;
  nombre: string;
  total: string;
  cantidad: number;
}

export interface TotalCajero {
  id: number;
  nombre: string;
  total: string;
  por_metodo: TotalMetodo[];
}

export interface ArqueosResponse {
  count: number;
  page: number;
  pages: number;
  results: TurnoCaja[];
  totales_por_cajero: TotalCajero[];
  totales_por_metodo: TotalMetodo[];
}

export interface VentasResumenResponse {
  total_ventas: string;
  total_cobrado: string;
  cantidad_ventas: number;
}

export interface TurnoResumen {
  turno: TurnoCaja;
  total_ventas: string;
  cantidad_ventas: number;
  total_ventas_efectivo: string;
  total_ingresos: string;
  total_retiros: string;
  efectivo_esperado: string;
  diferencia: string;
  ventas_por_metodo: { metodo: string; total: string; cantidad: number }[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PosService {
  constructor(private http: HttpClient) {}

  // ── Sucursales / Cajas ───────────────────────────────────────────────────

  getSucursales(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${API}/branches/sucursales/`);
  }

  getCajas(sucursalId: number): Observable<Caja[]> {
    return this.http.get<Caja[]>(`${API}/branches/sucursales/${sucursalId}/cajas/`);
  }

  // ── Métodos de pago ──────────────────────────────────────────────────────

  getMetodosPago(): Observable<MetodoPago[]> {
    return this.http.get<MetodoPago[]>(`${API}/pos/metodos-pago/`);
  }

  // ── Productos ────────────────────────────────────────────────────────────

  buscarProducto(q: string): Observable<ScanResult> {
    const params = new HttpParams().set('code', q);
    return this.http.get<ScanResult>(`${API}/pos/scan/`, { params });
  }

  // ── Ventas ───────────────────────────────────────────────────────────────

  crearVenta(payload: VentaPOSCreatePayload): Observable<VentaPOS> {
    return this.http.post<VentaPOS>(`${API}/pos/ventas/`, payload);
  }

  getVentas(filters?: {
    periodo?: string;
    sucursal_id?: number;
    status?: string;
    cajero_id?: number;
    metodo_pago_tipo?: string;
    page?: number;
    page_size?: number;
  }): Observable<PaginatedResponse<VentaPOS>> {
    let params = new HttpParams();
    if (filters?.periodo)    params = params.set('periodo', filters.periodo);
    if (filters?.sucursal_id) params = params.set('sucursal_id', String(filters.sucursal_id));
    if (filters?.status)     params = params.set('status', filters.status);
    if (filters?.cajero_id)  params = params.set('cajero_id', String(filters.cajero_id));
    if (filters?.metodo_pago_tipo) params = params.set('metodo_pago_tipo', filters.metodo_pago_tipo);
    if (filters?.page)       params = params.set('page', String(filters.page));
    if (filters?.page_size)  params = params.set('page_size', String(filters.page_size));
    return this.http.get<PaginatedResponse<VentaPOS>>(`${API}/pos/ventas/`, { params });
  }

  getVenta(id: number): Observable<VentaPOS> {
    return this.http.get<VentaPOS>(`${API}/pos/ventas/${id}/`);
  }

  anularVenta(id: number): Observable<VentaPOS> {
    return this.http.post<VentaPOS>(`${API}/pos/ventas/${id}/anular/`, {});
  }

  registrarMovimientoCaja(turnoId: number, tipo: 'ingreso' | 'retiro', concepto: string, monto: number): Observable<any> {
    return this.http.post(`${API}/pos/turnos/${turnoId}/movimiento/`, { tipo, concepto, monto });
  }

  getTurnos(periodo = 'today'): Observable<any[]> {
    return this.http.get<any[]>(`${API}/pos/turnos/list_turnos/`, {
      params: new HttpParams().set('periodo', periodo),
    });
  }

  cobrarCredito(id: number, metodo_pago_id?: number, monto_recibido?: number): Observable<VentaPOS> {
    return this.http.post<VentaPOS>(`${API}/pos/ventas/${id}/cobrar-credito/`, {
      metodo_pago_id: metodo_pago_id ?? null,
      monto_recibido: monto_recibido ?? null,
    });
  }

  getPagosCredito(ventaId: number): Observable<PagoCredito[]> {
    return this.http.get<PagoCredito[]>(`${API}/pos/ventas/${ventaId}/pagos-credito/`);
  }

  registrarPagoCredito(ventaId: number, payload: { monto: number; metodo_pago_id?: number | null; notas?: string }): Observable<{ pago: PagoCredito; venta: VentaPOS }> {
    return this.http.post<{ pago: PagoCredito; venta: VentaPOS }>(`${API}/pos/ventas/${ventaId}/pagos-credito/`, payload);
  }

  // ── Turnos de caja ───────────────────────────────────────────────────────

  getTurnoActivo(cajaId: number): Observable<{ turno: TurnoCaja | null }> {
    const params = new HttpParams().set('caja_id', String(cajaId));
    return this.http.get<{ turno: TurnoCaja | null }>(`${API}/pos/turnos/activo/`, { params });
  }

  abrirTurno(cajaId: number, montoApertura: number): Observable<TurnoCaja> {
    return this.http.post<TurnoCaja>(`${API}/pos/turnos/abrir/`, {
      caja_id: cajaId,
      monto_apertura: montoApertura,
    });
  }

  cerrarTurno(turnoId: number, montoCierre: number, notas?: string): Observable<any> {
    return this.http.post<any>(`${API}/pos/turnos/${turnoId}/cerrar/`, {
      monto_cierre: montoCierre,
      notas_cierre: notas || '',
    });
  }

  getResumenTurno(turnoId: number): Observable<TurnoResumen> {
    return this.http.get<TurnoResumen>(`${API}/pos/turnos/${turnoId}/resumen/`);
  }

  editarFondo(turnoId: number, fondoInicial: number): Observable<{ fondo_inicial: string }> {
    return this.http.patch<{ fondo_inicial: string }>(
      `${API}/pos/turnos/${turnoId}/editar-fondo/`,
      { fondo_inicial: fondoInicial },
    );
  }

  getArqueos(
    periodo = 'month',
    page = 1,
    pageSize = 20,
    semana?: number | null,
    cajeroId?: number | null,
    sucursalId?: number | null,
    metodoPagoTipo?: string | null,
  ): Observable<ArqueosResponse> {
    let params = new HttpParams()
      .set('periodo', periodo)
      .set('page', String(page))
      .set('page_size', String(pageSize));
    if (semana != null)    params = params.set('semana', String(semana));
    if (cajeroId != null)  params = params.set('cajero_id', String(cajeroId));
    if (sucursalId != null) params = params.set('sucursal_id', String(sucursalId));
    if (metodoPagoTipo) params = params.set('metodo_pago_tipo', metodoPagoTipo);
    return this.http.get<ArqueosResponse>(`${API}/pos/turnos/arqueos/`, { params });
  }

  getVentasResumen(filters?: {
    periodo?: string;
    sucursal_id?: number;
    status?: string;
    cajero_id?: number;
    metodo_pago_tipo?: string;
  }): Observable<VentasResumenResponse> {
    let params = new HttpParams();
    if (filters?.periodo) params = params.set('periodo', filters.periodo);
    if (filters?.sucursal_id) params = params.set('sucursal_id', String(filters.sucursal_id));
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.cajero_id) params = params.set('cajero_id', String(filters.cajero_id));
    if (filters?.metodo_pago_tipo) params = params.set('metodo_pago_tipo', filters.metodo_pago_tipo);
    return this.http.get<VentasResumenResponse>(`${API}/pos/ventas/resumen/`, { params });
  }

  // ── Cupones ──────────────────────────────────────────────────────────────

  validarCupon(codigo: string, total: number): Observable<{
    valido: boolean;
    descuento_aplicado?: string;
    cupon_id?: number;
    error?: string;
  }> {
    const params = new HttpParams().set('codigo', codigo).set('total', String(total));
    return this.http.get<any>(`${API}/cupones/validar/`, { params });
  }
}
