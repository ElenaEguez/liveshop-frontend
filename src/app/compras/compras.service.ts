import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Proveedor {
  id?: number;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  notas?: string;
  activo?: boolean;
}

export interface VarianteDetalle {
  id: number;
  talla: string;
  color: string;
  color_hex: string;
  sku: string;
}

export interface OrdenCompraItemDistribucion {
  id?: number;
  variante: number;
  variante_detalle?: VarianteDetalle | null;
  cantidad: number;
}

export interface OrdenCompraItem {
  id?: number;
  producto: number;
  producto_nombre?: string;
  variante?: number | null;
  variante_detalle?: VarianteDetalle | null;
  distribuciones?: OrdenCompraItemDistribucion[];
  almacen?: number | null;
  descripcion?: string;
  cantidad: number;
  costo_mercaderia: number;
  flete_unitario: number;
  costo_unitario_total?: number;
  porcentaje_ganancia: number;
  precio_venta_sugerido?: number;
  precio_venta_es_manual?: boolean;
  precio_unitario: number;
  subtotal?: number;
}

export interface OrdenCompra {
  id?: number;
  numero?: string;
  proveedor?: number | null;
  proveedor_data?: Proveedor | null;
  factura_compra?: string;
  sucursal?: number | null;
  almacen?: number | null;
  fecha: string;
  fecha_entrega?: string | null;
  estado?: 'borrador' | 'pendiente' | 'recibida' | 'cancelada';
  notas?: string;
  subtotal?: number;
  descuento?: number;
  total?: number;
  cantidad_total?: number;
  items: OrdenCompraItem[];
  created_at?: string;
}

export interface ProductoLookup {
  id: number;
  name: string;
  barcode?: string | null;
  internal_code?: string;
  sku: string;
  variantes?: VarianteDetalle[];
}

export type DevolucionProveedorItem =
  | { producto: number; almacen: number; cantidad: number; variante?: number | null }
  | { orden_item_id: number; cantidad: number }
  | { orden_distribucion_id: number; cantidad: number };

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private proveedoresUrl = `${environment.apiUrl}/compras/proveedores/`;
  private ordenesUrl = `${environment.apiUrl}/compras/ordenes/`;
  private devolucionesProvUrl = `${environment.apiUrl}/compras/devoluciones-proveedor/`;
  private productosUrl = `${environment.apiUrl}/products/`;
  private almacenesUrl = `${environment.apiUrl}/branches/almacenes/`;

  constructor(private http: HttpClient) {}

  getProveedores(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(this.proveedoresUrl);
  }

  crearProveedor(payload: Partial<Proveedor>): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.proveedoresUrl, payload);
  }

  actualizarProveedor(id: number, payload: Partial<Proveedor>): Observable<Proveedor> {
    return this.http.patch<Proveedor>(`${this.proveedoresUrl}${id}/`, payload);
  }

  getAlmacenes(): Observable<any> {
    return this.http.get<any>(this.almacenesUrl);
  }

  getOrdenes(params?: { estado?: string }): Observable<OrdenCompra[]> {
    let httpParams = new HttpParams();
    if (params?.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    return this.http.get<any>(this.ordenesUrl, { params: httpParams }).pipe(
      map((res) => {
        if (Array.isArray(res)) {
          return res as OrdenCompra[];
        }
        if (res && Array.isArray(res.results)) {
          return res.results as OrdenCompra[];
        }
        return [];
      })
    );
  }

  getOrden(id: number): Observable<OrdenCompra> {
    return this.http.get<OrdenCompra>(`${this.ordenesUrl}${id}/`);
  }

  crearOrden(payload: Partial<OrdenCompra>): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(this.ordenesUrl, payload);
  }

  actualizarOrden(id: number, payload: Partial<OrdenCompra>): Observable<OrdenCompra> {
    return this.http.put<OrdenCompra>(`${this.ordenesUrl}${id}/`, payload);
  }

  confirmarOrden(id: number): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(`${this.ordenesUrl}${id}/confirmar/`, {});
  }

  cancelarOrden(id: number): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(`${this.ordenesUrl}${id}/cancelar/`, {});
  }

  registrarDevolucionProveedor(payload: {
    documento_ref?: string;
    notas?: string;
    orden_compra?: number;
    items: DevolucionProveedorItem[];
  }): Observable<any> {
    return this.http.post(this.devolucionesProvUrl, payload);
  }

  buscarProductos(query: string): Observable<ProductoLookup[]> {
    return this.http.get<any[]>(this.productosUrl, { params: { search: query } }).pipe(
      map((rows: any[]) =>
        (rows || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode || null,
          internal_code: p.internal_code || '',
          sku: p.sku || '',
          variantes: Array.isArray(p.variants)
            ? p.variants.map((v: any) => ({
                id: Number(v.id ?? 0),
                talla: String(v.talla ?? v.size ?? ''),
                color: String(v.color ?? ''),
                color_hex: String(v.color_hex ?? ''),
                sku: String(v.sku ?? ''),
              }))
            : [],
        }))
      )
    );
  }
}
