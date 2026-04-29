import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Legacy vendor summary (still used by WebSocket reconnect) ───────────────
export interface VentaMetodoPago {
  monto: number;
  cantidad: number;
}

export interface DashboardData {
  total_active_products: number;
  monthly_sales: number;
  pending_orders: number;
  next_live: string | null;
  ventas_por_metodo_pago?: { [nombre: string]: VentaMetodoPago };
}

// ── New sales-analytics dashboard ───────────────────────────────────────────
export interface VarianteVenta {
  variante: string;
  units_sold: number;
}

export interface SalesByProduct {
  product_id: number;
  product_name: string;
  category: string;
  units_sold: number;
  revenue: string;
  cost: string | null;
  margin: string | null;
  variantes: VarianteVenta[];
}

export interface GastoCategoria {
  categoria: string;
  total: string;
}

export interface SalesByPeriod {
  label: string;
  revenue: string;
  orders: number;
}

export interface SalesDashboardData {
  period_label: string;
  total_orders: number;
  total_revenue: string;
  pos_total_orders: number;
  pos_total_revenue: string;
  web_total_orders: number;
  web_total_revenue: string;
  total_cost: string | null;
  gross_margin: string | null;
  missing_cost_data: boolean;
  total_gastos_operativos: string | null;
  utilidad_neta: string | null;
  gastos_por_categoria: GastoCategoria[];
  pending_payment_confirmation: number;
  sales_by_product: SalesByProduct[];
  sales_by_period: SalesByPeriod[];
  total_ingresos_caja: string;
  total_retiros_caja: string;
}

export interface MovimientoCaja {
  fecha: string;
  caja: string;
  tipo: string;
  usuario: string;
  detalle: string;
  monto: string;
}

export interface MovimientosCajaResponse {
  count: number;
  page: number;
  pages: number;
  results: MovimientoCaja[];
}

export interface SalesDashboardParams {
  period?: 'week' | 'month' | 'year' | 'day';
  date?: string;   // YYYY-MM-DD, only when period='day'
  month?: number;
  year?: number;
  category_id?: number | null;
  canal?: 'todos' | 'live' | 'tienda' | 'web';
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private vendorDashboardUrl = `${environment.apiUrl}/vendors/dashboard`;
  private salesDashboardUrl  = `${environment.apiUrl}/orders/dashboard/`;

  constructor(private http: HttpClient) {}

  getDashboardData(periodo = 'month'): Observable<DashboardData> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http.get<DashboardData>(this.vendorDashboardUrl, { params });
  }

  getMovimientosCaja(period = 'today', page = 1, pageSize = 10): Observable<MovimientosCajaResponse> {
    const params = new HttpParams()
      .set('period', period)
      .set('page', String(page))
      .set('page_size', String(pageSize));
    return this.http.get<MovimientosCajaResponse>(`${environment.apiUrl}/pos/movimientos/`, { params });
  }

  getSalesDashboard(params: SalesDashboardParams = {}): Observable<SalesDashboardData> {
    let httpParams = new HttpParams();
    if (params.period) httpParams = httpParams.set('period', params.period);
    if (params.period === 'day') {
      if (params.date) httpParams = httpParams.set('date', params.date);
    } else {
      if (params.year != null) httpParams = httpParams.set('year', String(params.year));
      if (params.period !== 'year' && params.month != null) {
        httpParams = httpParams.set('month', String(params.month));
      }
    }
    if (params.category_id != null) {
      httpParams = httpParams.set('category_id', String(params.category_id));
    }
    if (params.canal) {
      httpParams = httpParams.set('canal', params.canal);
    }
    return this.http.get<SalesDashboardData>(this.salesDashboardUrl, { params: httpParams });
  }
}
