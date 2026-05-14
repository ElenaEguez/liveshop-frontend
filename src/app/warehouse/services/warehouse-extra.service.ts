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
  aprobado_por_nombre?: string;
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

  getTransferencias(): Observable<Transferencia[]> {
    return this.http.get<any>(
      `${this.base}/transferencias/`
    ).pipe(map(r => this.asArray<Transferencia>(r)));
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

  getConteos(params?: { estado?: string }): Observable<ConteoFisico[]> {
    let hp = new HttpParams();
    if (params?.estado) {
      hp = hp.set('estado', params.estado);
    }
    return this.http.get<any>(
      `${this.base}/conteos/`,
      { params: hp }
    ).pipe(map(r => this.asArray<ConteoFisico>(r)));
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
}
