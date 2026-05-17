import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../products/products.service';

export interface Category {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/products/categories/`;

  constructor(private http: HttpClient) {}

  getCategories(
    page = 1,
    pageSize = 10,
    search?: string
  ): Observable<PaginatedResponse<Category>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(pageSize));
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<PaginatedResponse<Category>>(this.apiUrl, { params });
  }

  /** Todas las categorías (p. ej. filtros en dashboard). */
  getAllCategories(): Observable<Category[]> {
    return this.getCategories(1, 500).pipe(map(res => res.results ?? []));
  }

  createCategory(data: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, data);
  }

  updateCategory(id: number, data: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}${id}/`, data);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
