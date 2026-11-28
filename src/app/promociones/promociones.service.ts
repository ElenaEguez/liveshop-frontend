import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductoDetalle {
  id: number;
  nombre: string;
  sku: string | null;
  precio: string;
}

export interface CategoriaDetalle {
  id: number;
  nombre: string;
}

export interface Promocion {
  id: number;
  nombre: string;
  tipo: 'porcentaje' | 'monto';
  valor: string;
  productos: number[];
  categorias: number[];
  productos_detalle: ProductoDetalle[];
  categorias_detalle: CategoriaDetalle[];
  aplica_web: boolean;
  aplica_pos: boolean;
  aplica_live: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean;
  estado: 'activa' | 'programada' | 'vencida' | 'inactiva';
  created_at: string;
  updated_at: string;
}

export interface PromocionInput {
  nombre: string;
  tipo: 'porcentaje' | 'monto';
  valor: number | string;
  productos: number[];
  categorias: number[];
  aplica_web: boolean;
  aplica_pos: boolean;
  aplica_live: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean;
}

export interface VistaPreviaEjemplo {
  producto_id: number;
  producto: string;
  precio_antes: string;
  precio_despues: string;
}

export interface VistaPrevia {
  productos_afectados: number;
  ejemplos: VistaPreviaEjemplo[];
}

@Injectable({ providedIn: 'root' })
export class PromocionesService {
  private apiUrl = `${environment.apiUrl}/promociones`;

  constructor(private http: HttpClient) {}

  getPromociones(): Observable<Promocion[]> {
    return this.http.get<Promocion[]>(`${this.apiUrl}/`);
  }

  createPromocion(data: PromocionInput): Observable<Promocion> {
    return this.http.post<Promocion>(`${this.apiUrl}/`, data);
  }

  updatePromocion(id: number, data: Partial<PromocionInput>): Observable<Promocion> {
    return this.http.patch<Promocion>(`${this.apiUrl}/${id}/`, data);
  }

  deletePromocion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }

  getConfig(): Observable<{ canal_web_habilitado: boolean }> {
    return this.http.get<{ canal_web_habilitado: boolean }>(`${this.apiUrl}/config/`);
  }

  vistaPrevia(data: {
    tipo: string; valor: number | string; productos: number[]; categorias: number[];
  }): Observable<VistaPrevia> {
    return this.http.post<VistaPrevia>(`${this.apiUrl}/vista-previa/`, data);
  }
}
