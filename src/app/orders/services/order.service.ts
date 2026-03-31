import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type OrderStatus =
  | 'pending' | 'confirmed' | 'recibido'
  | 'delivered' | 'cancelled' | 'paid';

export interface Order {
  id: number;
  session: number;
  session_title: string;
  product: number;
  product_name: string;
  product_price: number;
  customer_name: string;
  customer_phone: string;
  quantity: number;
  status: OrderStatus;
  notes?: string;
  variant_detail?: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  payment_receipt_image?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_status?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface OrderFilters {
  status?: OrderStatus | '';
  search?: string;
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private apiUrl = 'http://localhost:8000/api/v1/orders/reservations';

  constructor(private http: HttpClient) {}

  getOrders(filters?: OrderFilters): Observable<PaginatedResponse<Order>> {
    let params = new HttpParams();
    if (filters?.status)    params = params.set('status',    filters.status);
    if (filters?.search)    params = params.set('search',    filters.search);
    if (filters?.page)      params = params.set('page',      String(filters.page));
    if (filters?.page_size) params = params.set('page_size', String(filters.page_size));
    return this.http.get<PaginatedResponse<Order>>(`${this.apiUrl}/`, { params });
  }

  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}/`);
  }

  updateStatus(id: number, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/${id}/`, { status });
  }
}
