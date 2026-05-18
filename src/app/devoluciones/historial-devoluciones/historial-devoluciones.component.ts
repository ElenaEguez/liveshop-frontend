import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import {
  DevolucionesService,
  Devolucion,
} from '../../payments/devoluciones.service';

@Component({
  selector: 'app-historial-devoluciones',
  templateUrl: './historial-devoluciones.component.html',
  styleUrls: ['./historial-devoluciones.component.scss'],
})
export class HistorialDevolucionesComponent implements OnInit {
  devoluciones: Devolucion[] = [];
  cargando = true;
  fechaDesde = '';
  fechaHasta = '';
  currentPage = 1;
  totalItems = 0;
  pageSize = 20;

  columnas = [
    'ticket',
    'tipo',
    'metodo',
    'monto',
    'procesado_por',
    'fecha',
  ];

  constructor(
    private svc: DevolucionesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    const params: {
      page: number;
      page_size: number;
      fecha_desde?: string;
      fecha_hasta?: string;
    } = {
      page: this.currentPage,
      page_size: this.pageSize,
    };
    if (this.fechaDesde) {
      params.fecha_desde = this.fechaDesde;
    }
    if (this.fechaHasta) {
      params.fecha_hasta = this.fechaHasta;
    }

    this.svc.getDevoluciones(params).subscribe({
      next: (data) => {
        this.devoluciones = data?.results ?? [];
        this.totalItems = data?.count ?? 0;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.devoluciones = [];
        this.totalItems = 0;
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  onFiltrosChange(): void {
    this.currentPage = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.currentPage = 1;
    this.cargar();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.cargar();
  }

  onNuevaDevolucion(): void {
    this.router.navigate(['/devoluciones/nueva']);
  }

  getColorTipo(tipo: string): string {
    return tipo === 'total' ? 'warn' : 'accent';
  }
}
