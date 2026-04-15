import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductVariant } from '../../products/products.service';
import { environment } from '../../../environments/environment';

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

export interface PaginatedKardex {
  count: number;
  next: string | null;
  previous: string | null;
  results: KardexMovimiento[];
}

export interface Inventory {
  id: number;
  product: number;
  product_name: string;
  product_price: number;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  purchase_cost: number | null;
  almacen: number | null;
}

export interface InventoryFilters {
  almacen_id?: number;
  category?: number;
  search?: string;
  talla?: string;
  color?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private apiUrl = `${environment.apiUrl}/products/inventories/`;
  private productsUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getInventory(filters?: InventoryFilters): Observable<Inventory[]> {
    let params = new HttpParams();
    if (filters?.almacen_id) params = params.set('almacen_id', filters.almacen_id.toString());
    if (filters?.category)   params = params.set('category',   filters.category.toString());
    if (filters?.search)     params = params.set('search',     filters.search);
    if (filters?.talla)      params = params.set('talla',      filters.talla);
    if (filters?.color)      params = params.set('color',      filters.color);
    return this.http.get<Inventory[]>(this.apiUrl, { params });
  }

  updateStock(id: number, quantity: number, purchase_cost?: number | null): Observable<Inventory> {
    const body: Record<string, unknown> = { quantity };
    if (purchase_cost !== undefined) body['purchase_cost'] = purchase_cost;
    return this.http.patch<Inventory>(`${this.apiUrl}${id}/`, body);
  }

  getVariantes(productId: number): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(`${this.productsUrl}/${productId}/variantes/`);
  }

  getKardex(filters: {
    product_id?: number;
    tipo?: string;
    motivo?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    page?: number;
    page_size?: number;
  }): Observable<PaginatedKardex> {
    let params = new HttpParams();
    if (filters.product_id) params = params.set('product_id',  String(filters.product_id));
    if (filters.tipo)        params = params.set('tipo',        filters.tipo);
    if (filters.motivo)      params = params.set('motivo',      filters.motivo);
    if (filters.fecha_desde) params = params.set('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params = params.set('fecha_hasta', filters.fecha_hasta);
    if (filters.page)        params = params.set('page',        String(filters.page));
    if (filters.page_size)   params = params.set('page_size',   String(filters.page_size));
    return this.http.get<PaginatedKardex>(`${environment.apiUrl}/inventory/kardex/`, { params });
  }

  getSucursales(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/branches/`);
  }

  getAlmacenes(sucursalId?: number): Observable<any[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal', sucursalId.toString());
    return this.http.get<any[]>(`${environment.apiUrl}/branches/almacenes/`, { params });
  }
}
