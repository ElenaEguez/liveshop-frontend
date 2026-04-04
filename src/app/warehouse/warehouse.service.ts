import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

export interface KardexMovimiento {
  id: number;
  inventory: number;
  product_name: string;
  almacen: number | null;
  almacen_nombre: string | null;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
  motivo: string;
  cantidad: number;
  stock_anterior: number;
  stock_actual: number;
  costo_promedio: string | null;
  documento_ref: string;
  usuario: number | null;
  usuario_email: string | null;
  usuario_nombre: string | null;
  notas: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface KardexFilters {
  product_id?: number;
  almacen_id?: number;
  tipo?: string;
  motivo?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  constructor(private http: HttpClient) {}

  getKardex(filters?: KardexFilters): Observable<PaginatedResponse<KardexMovimiento>> {
    let params = new HttpParams();
    if (filters?.product_id)  params = params.set('product_id',  String(filters.product_id));
    if (filters?.almacen_id)  params = params.set('almacen_id',  String(filters.almacen_id));
    if (filters?.tipo)        params = params.set('tipo',         filters.tipo);
    if (filters?.motivo)      params = params.set('motivo',       filters.motivo);
    if (filters?.fecha_desde) params = params.set('fecha_desde',  filters.fecha_desde);
    if (filters?.fecha_hasta) params = params.set('fecha_hasta',  filters.fecha_hasta);
    if (filters?.page)        params = params.set('page',         String(filters.page));
    if (filters?.page_size)   params = params.set('page_size',    String(filters.page_size));
    return this.http.get<PaginatedResponse<KardexMovimiento>>(`${API}/inventory/kardex/`, { params });
  }

  ajustar(payload: {
    inventory_id: number;
    cantidad: number;
    motivo?: string;
    notas?: string;
  }): Observable<KardexMovimiento> {
    return this.http.post<KardexMovimiento>(`${API}/inventory/kardex/ajuste/`, payload);
  }

  getInventories(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/products/inventories/`);
  }

  getAlmacenes(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/branches/almacenes/`);
  }

  getSucursales(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/branches/sucursales/`);
  }
}
