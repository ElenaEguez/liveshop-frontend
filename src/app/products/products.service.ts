import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: number;
  images: string[];
  is_active: boolean;
  variants: Variant[];
  purchase_cost?: number | null;
  shipping_cost?: number | null;
  profit_margin_percent?: number | null;
  barcode?: string | null;
  internal_code?: string;
  sell_by?: string[];
}

export interface Variant {
  size?: string;
  color?: string;
  stock: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface ProductVariant {
  id: number;
  talla: string;
  color: string;
  color_hex: string;
  sku?: string | null;
  stock_extra: number;
  is_active: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) { }

  getProducts(
    page: number = 1,
    search?: string,
    category?: number,
    talla?: string,
    color?: string,
    isActive?: boolean
  ): Observable<PaginatedResponse<Product>> {
    let params = new HttpParams().set('page', page.toString());
    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category.toString());
    if (talla) params = params.set('talla', talla);
    if (color) params = params.set('color', color);
    if (isActive !== undefined) params = params.set('is_active', String(isActive));
    return this.http.get<PaginatedResponse<Product>>(`${this.apiUrl}/`, { params });
  }

  getAllVariantOptions(): Observable<{ tallas: string[]; colors: string[] }> {
    return this.http.get<{ tallas: string[]; colors: string[] }>(`${this.apiUrl}/variant-options/`);
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}/`);
  }

  createProduct(product: FormData): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/`, product);
  }

  updateProduct(id: number, product: FormData): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}/`, product);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories/`);
  }

  getVariantes(productId: number): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(`${this.apiUrl}/${productId}/variantes/`);
  }

  getVariantesTallas(productId: number): Observable<{ tallas: string[] }> {
    return this.http.get<{ tallas: string[] }>(`${this.apiUrl}/${productId}/variantes/tallas/`);
  }

  getVariantesColores(productId: number, talla?: string): Observable<{ colores: ProductVariant[] }> {
    let params = new HttpParams();
    if (talla) params = params.set('talla', talla);
    return this.http.get<{ colores: ProductVariant[] }>(`${this.apiUrl}/${productId}/variantes/colores/`, { params });
  }
}