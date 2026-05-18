import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TransferenciaItem {
  id?: number;
  producto: number;
  producto_nombre?: string;
  variante?: number | null;
  variante_detalle?: {
    id: number;
    talla: string;
    color: string;
    color_hex: string;
  } | null;
  cantidad: number;
  stock_actual?: number;
}

export interface Transferencia {
  id?: number;
  almacen_origen: number;
  almacen_origen_nombre?: string;
  almacen_destino: number;
  almacen_destino_nombre?: string;
  estado?: 'pendiente' | 'completada' | 'cancelada';
  notas?: string;
  items: TransferenciaItem[];
  creado_por_nombre?: string;
  created_at?: string;
}

export interface ConteoItem {
  id?: number;
  producto: number;
  producto_nombre?: string;
  producto_requiere_variante?: boolean;
  variante?: number | null;
  variante_detalle?: {
    id: number;
    talla: string;
    color: string;
    color_hex: string;
  } | null;
  stock_sistema?: number;
  stock_fisico: number;
  diferencia?: number;
  notas?: string;
}

export interface ConteoFisico {
  id?: number;
  almacen: number;
  almacen_nombre?: string;
  estado?: 'abierto' | 'cerrado' | 'aprobado' | 'cancelado';
  fecha: string;
  notas?: string;
  items?: ConteoItem[];
  creado_por_nombre?: string;
  total_diferencias?: number;
  items_con_diferencia?: number;
  created_at?: string;
  updated_at?: string;
  aprobado_por_nombre?: string;
}

export interface ConteosPaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ConteoFisico[];
}

@Injectable({ providedIn: 'root' })
export class WarehouseExtraService {
  private base = `${environment.apiUrl}/vendors`;

  constructor(private http: HttpClient) {}

  /** Normaliza lista o respuesta paginada DRF. */
  private asArray<T>(r: any): T[] {
    if (Array.isArray(r)) return r;
    return (r?.results as T[]) || [];
  }

  getTransferencias(params?: {
    page?: number;
    page_size?: number;
    estado?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    const paginatedRequest = params?.page != null;
    if (params?.page != null) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.page_size != null) {
      httpParams = httpParams.set('page_size', String(params.page_size));
    }
    if (params?.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    return this.http.get<any>(
      `${this.base}/transferencias/`,
      { params: httpParams },
    ).pipe(
      map((r) => {
        if (paginatedRequest) {
          return r;
        }
        return this.asArray<Transferencia>(r);
      }),
    );
  }

  actualizarTransferencia(
    id: number,
    data: { notas?: string; items: { producto: number; variante?: number | null; cantidad: number }[] },
  ): Observable<Transferencia> {
    return this.http.patch<Transferencia>(
      `${this.base}/transferencias/${id}/`,
      data,
    );
  }

  getTransferencia(id: number): Observable<Transferencia> {
    return this.http.get<Transferencia>(
      `${this.base}/transferencias/${id}/`);
  }

  crearTransferencia(data: Partial<Transferencia>
  ): Observable<Transferencia> {
    return this.http.post<Transferencia>(
      `${this.base}/transferencias/`, data);
  }

  confirmarTransferencia(id: number): Observable<Transferencia> {
    return this.http.post<Transferencia>(
      `${this.base}/transferencias/${id}/confirmar/`, {});
  }

  cancelarTransferencia(id: number): Observable<Transferencia> {
    return this.http.post<Transferencia>(
      `${this.base}/transferencias/${id}/cancelar/`, {});
  }

  getConteos(params?: {
    estado?: string;
    almacen_id?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
    page?: number;
    page_size?: number;
  }): Observable<ConteosPaginatedResponse> {
    let hp = new HttpParams();
    if (params?.estado) {
      hp = hp.set('estado', params.estado);
    }
    if (params?.almacen_id != null) {
      hp = hp.set('almacen_id', String(params.almacen_id));
    }
    if (params?.fecha_desde) {
      hp = hp.set('fecha_desde', params.fecha_desde);
    }
    if (params?.fecha_hasta) {
      hp = hp.set('fecha_hasta', params.fecha_hasta);
    }
    if (params?.page != null) {
      hp = hp.set('page', String(params.page));
    }
    if (params?.page_size != null) {
      hp = hp.set('page_size', String(params.page_size));
    }
    return this.http.get<ConteosPaginatedResponse>(
      `${this.base}/conteos/`,
      { params: hp },
    );
  }

  getConteo(id: number): Observable<ConteoFisico> {
    return this.http.get<ConteoFisico>(
      `${this.base}/conteos/${id}/`);
  }

  crearConteo(data: Partial<ConteoFisico>
  ): Observable<ConteoFisico> {
    return this.http.post<ConteoFisico>(
      `${this.base}/conteos/`, data);
  }

  agregarItem(id: number,
              item: Partial<ConteoItem>): Observable<ConteoItem> {
    return this.http.post<ConteoItem>(
      `${this.base}/conteos/${id}/agregar-item/`, item);
  }

  cerrarConteo(id: number): Observable<ConteoFisico> {
    return this.http.post<ConteoFisico>(
      `${this.base}/conteos/${id}/cerrar/`, {});
  }

  aprobarConteo(id: number): Observable<any> {
    return this.http.post<any>(
      `${this.base}/conteos/${id}/aprobar/`, {});
  }

  cancelarConteo(id: number): Observable<ConteoFisico> {
    return this.http.post<ConteoFisico>(
      `${this.base}/conteos/${id}/cancelar/`, {});
  }

  editarItemConteo(
    conteoId: number,
    itemId: number,
    data: { stock_fisico?: number; notas?: string },
  ): Observable<ConteoItem> {
    return this.http.patch<ConteoItem>(
      `${this.base}/conteos/${conteoId}/editar-item/${itemId}/`,
      data,
    );
  }

  buscarProductos(query: string): Observable<any[]> {
    const params = new HttpParams().set('search', query);
    const url = `${environment.apiUrl}/products/`;
    return this.http.get<any>(url, { params }).pipe(
      map((resp: any) => {
        const rows = Array.isArray(resp) ? resp : (resp?.results || []);
        return (rows || []).map((p: any) => {
          const rawList = Array.isArray(p.variantes)
            ? p.variantes
            : Array.isArray(p.variants)
              ? p.variants
              : [];
          const variantes = rawList
            .map((v: any) => ({
              id: Number(v.id),
              talla: String(v.talla ?? v.size ?? ''),
              color: String(v.color ?? ''),
              color_hex: String(v.color_hex ?? ''),
            }))
            .filter((v: { id: number }) => Number.isFinite(v.id) && v.id > 0);
          return {
            id: p.id,
            name: p.name,
            sku: p.sku || '',
            variantes,
          };
        });
      })
    );
  }

  getAlmacenes(): Observable<any[]> {
    return this.http.get<any>(
      `${environment.apiUrl}/branches/almacenes/`
    ).pipe(map(r => this.asArray<any>(r)));
  }

  /**
   * Stock en almacén origen (Inventory), no la suma global de variantes.
   * Misma regla que al confirmar una transferencia.
   */
  getStockEnAlmacen(
    productoId: number,
    almacenId: number,
    varianteId?: number | null,
  ): Observable<number> {
    let params = new HttpParams()
      .set('product_id', String(productoId))
      .set('almacen_id', String(almacenId))
      .set('use_warehouse_stock', '1')
      .set('page_size', '1');
    if (varianteId != null) {
      params = params.set('variante_id', String(varianteId));
    }
    return this.http.get<any>(
      `${environment.apiUrl}/products/inventories/`,
      { params },
    ).pipe(
      map((resp: any) => {
        const rows = Array.isArray(resp) ? resp : (resp?.results ?? []);
        const row = rows[0];
        if (!row) {
          return 0;
        }
        const wh = row.inventario_disponible ?? row.available_quantity;
        if (wh != null) {
          return Math.max(0, Number(wh) || 0);
        }
        const q = Number(row.quantity) || 0;
        const r = Number(row.reserved_quantity) || 0;
        return Math.max(0, q - r);
      }),
    );
  }
}
