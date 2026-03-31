import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type PaymentStatus = 'pending' | 'submitted' | 'confirmed' | 'rejected';
export type PaymentMethod = 'tigo_money' | 'banco_union' | 'qr' | 'cash' | 'other';

export interface Payment {
  id: number;
  reservation: number;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  session_title: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  receipt_image: string | null;
  customer_reference: string | null;
  vendor_notes: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = 'http://localhost:8000/api/v1/payments/payments';
  readonly mediaBase = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  getPayments(status?: PaymentStatus | '', page = 1, pageSize = 20): Observable<{ count: number; results: Payment[] }> {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (status) params = params.set('status', status);
    return this.http.get<{ count: number; results: Payment[] }>(`${this.apiUrl}/`, { params });
  }

  confirmPayment(id: number, vendorNotes: string = ''): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/${id}/confirm/`, {
      action: 'confirm',
      vendor_notes: vendorNotes
    });
  }

  rejectPayment(id: number, vendorNotes: string = ''): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/${id}/reject/`, {
      action: 'reject',
      vendor_notes: vendorNotes
    });
  }

  getReceiptUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${this.mediaBase}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  getMethodLabel(method: string): string {
    const map: Record<string, string> = {
      tigo_money: 'Tigo Money',
      banco_union: 'Banco Unión',
      qr: 'QR',
      cash: 'Efectivo',
      other: 'Otro'
    };
    return map[method] ?? method;
  }
}
