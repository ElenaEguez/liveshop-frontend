import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = 'http://localhost:8000/api/v1';

export interface CategoriaGasto {
  id: number;
  nombre: string;
}

export interface GastoOperativo {
  id: number;
  sucursal: number | null;
  sucursal_nombre: string | null;
  categoria: number | null;
  categoria_nombre: string | null;
  concepto: string;
  monto: string;
  fecha: string;
  status: 'pendiente' | 'aprobado' | 'anulado';
  usuario: number | null;
  notas: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  constructor(private http: HttpClient) {}

  getCategorias(): Observable<CategoriaGasto[]> {
    return this.http.get<CategoriaGasto[]>(`${API}/gastos/categorias/`);
  }

  createCategoria(nombre: string): Observable<CategoriaGasto> {
    return this.http.post<CategoriaGasto>(`${API}/gastos/categorias/`, { nombre });
  }

  deleteCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/gastos/categorias/${id}/`);
  }

  getGastos(filters?: {
    periodo?: string;
    fecha?: string;
    categoria_id?: number;
    page?: number;
    page_size?: number;
  }): Observable<PaginatedResponse<GastoOperativo>> {
    let params = new HttpParams();
    if (filters?.periodo)      params = params.set('periodo',      filters.periodo);
    if (filters?.fecha)        params = params.set('fecha',        filters.fecha);
    if (filters?.categoria_id) params = params.set('categoria_id', String(filters.categoria_id));
    if (filters?.page)         params = params.set('page',         String(filters.page));
    if (filters?.page_size)    params = params.set('page_size',    String(filters.page_size));
    return this.http.get<PaginatedResponse<GastoOperativo>>(`${API}/gastos/`, { params });
  }

  createGasto(payload: Partial<GastoOperativo>): Observable<GastoOperativo> {
    return this.http.post<GastoOperativo>(`${API}/gastos/`, payload);
  }

  updateGasto(id: number, payload: Partial<GastoOperativo>): Observable<GastoOperativo> {
    return this.http.patch<GastoOperativo>(`${API}/gastos/${id}/`, payload);
  }

  anularGasto(id: number): Observable<GastoOperativo> {
    return this.http.patch<GastoOperativo>(`${API}/gastos/${id}/`, { status: 'anulado' });
  }
}
