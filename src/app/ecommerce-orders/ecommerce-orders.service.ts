import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type EcomOrderStatus = 'pending' | 'pending_confirmation' | 'confirmed' | 'delivered' | 'cancelled';

export interface EcomOrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image?: string;
  variant_id?: number;
  variant_detail?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface EcomOrder {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  delivery_method: 'pickup' | 'delivery';
  payment_method: 'tigo_money' | 'banco_union' | 'efectivo';
  payment_receipt?: string;
  payment_receipt_url?: string;
  status: EcomOrderStatus;
  notes?: string;
  total_amount: number;
  items: EcomOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedEcomOrders {
  count: number;
  next: string | null;
  previous: string | null;
  results: EcomOrder[];
}

export interface EcomOrderFilters {
  status?: EcomOrderStatus | '';
  search?: string;
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: 'root' })
export class EcommerceOrdersService {
  private apiUrl = '/api/website-builder/orders';

  constructor(private http: HttpClient) {}

  getOrders(filters: EcomOrderFilters = {}): Observable<PaginatedEcomOrders> {
    let params = new HttpParams();
    if (filters.status)    params = params.set('status',    filters.status);
    if (filters.search)    params = params.set('search',    filters.search);
    if (filters.page)      params = params.set('page',      String(filters.page));
    if (filters.page_size) params = params.set('page_size', String(filters.page_size));
    return this.http.get<PaginatedEcomOrders>(`${this.apiUrl}/`, { params });
  }

  getOrder(id: number): Observable<EcomOrder> {
    return this.http.get<EcomOrder>(`${this.apiUrl}/${id}/`);
  }

  confirmOrder(id: number): Observable<EcomOrder> {
    return this.http.post<EcomOrder>(`${this.apiUrl}/${id}/confirm/`, {});
  }

  markDelivered(id: number): Observable<EcomOrder> {
    return this.http.post<EcomOrder>(`${this.apiUrl}/${id}/mark-delivered/`, {});
  }

  cancelOrder(id: number): Observable<EcomOrder> {
    return this.http.post<EcomOrder>(`${this.apiUrl}/${id}/cancel/`, {});
  }

  deleteCancelledOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/delete/`);
  }

  getPendingCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/pending-count/`);
  }
}
