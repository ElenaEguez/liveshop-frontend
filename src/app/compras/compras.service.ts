import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

export interface OrdenCompraItem {
  id?: number;
  producto: number;
  producto_nombre?: string;
  variante?: number | null;
  variante_detalle?: VarianteDetalle | null;
  almacen?: number | null;
  descripcion?: string;
  cantidad: number;
  costo_mercaderia: number;
  flete_unitario: number;
  costo_unitario_total?: number;
  porcentaje_ganancia: number;
  precio_venta_sugerido?: number;
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

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private proveedoresUrl = `${environment.apiUrl}/compras/proveedores/`;
  private ordenesUrl = `${environment.apiUrl}/compras/ordenes/`;
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

  getOrdenes(): Observable<OrdenCompra[]> {
    return this.http.get<OrdenCompra[]>(this.ordenesUrl);
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
