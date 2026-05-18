import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { ComprasService, OrdenCompra, Proveedor } from '../compras.service';

@Component({
  selector: 'app-orden-list',
  templateUrl: './orden-list.component.html',
  styleUrls: ['./orden-list.component.scss']
})
export class OrdenListComponent implements OnInit {
  ordenes: OrdenCompra[] = [];
  proveedores: Proveedor[] = [];
  filtroProveedor: number | null = null;
  filtroEstado = '';
  currentPage = 1;
  totalItems = 0;
  pageSize = 10;
  cargando = false;

  readonly estadosFiltro = [
    { value: '', label: 'Todos' },
    { value: 'borrador', label: 'Borrador' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'recibida', label: 'Recibida' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

  constructor(
    private comprasService: ComprasService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.comprasService.getProveedores().subscribe({
      next: (rows) => { this.proveedores = rows || []; },
      error: () => {},
    });
    this.cargarOrdenes();
  }

  cargarOrdenes(): void {
    this.cargando = true;
    const params: {
      page: number;
      page_size: number;
      proveedor_id?: number;
      estado?: string;
    } = {
      page: this.currentPage,
      page_size: this.pageSize,
    };
    if (this.filtroProveedor != null) {
      params.proveedor_id = this.filtroProveedor;
    }
    if (this.filtroEstado) {
      params.estado = this.filtroEstado;
    }

    this.comprasService.getOrdenes(params).subscribe({
      next: (res) => {
        this.ordenes = res?.results ?? [];
        this.totalItems = res?.count ?? 0;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.snackBar.open('Error al cargar órdenes', 'Cerrar', { duration: 4000 });
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.cargarOrdenes();
  }

  onFiltroChange(): void {
    this.currentPage = 1;
    this.cargarOrdenes();
  }

  eliminarOrden(orden: OrdenCompra): void {
    if (!orden.id) return;
    const msg = `¿Eliminar la orden ${orden.numero || orden.id}? Esta acción no se puede deshacer.`;
    if (!confirm(msg)) return;

    this.comprasService.eliminarOrden(orden.id).subscribe({
      next: () => {
        this.snackBar.open('Orden eliminada correctamente', 'Cerrar', { duration: 4000 });
        this.cargarOrdenes();
      },
      error: (err) => {
        const detail = err.error?.detail;
        const text = typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.join(' ')
            : err.error?.error || 'No se pudo eliminar la orden';
        this.snackBar.open(text, 'Cerrar', { duration: 5000 });
      },
    });
  }

  irNueva(): void {
    this.router.navigate(['/compras/new']);
  }

  puedeEditar(o: OrdenCompra): boolean {
    const e = o.estado;
    return e === 'borrador' || e === 'pendiente';
  }

  puedeEliminar(o: OrdenCompra): boolean {
    return o.estado === 'borrador' || o.estado === 'pendiente';
  }

  estadoLabel(o: OrdenCompra): string {
    const labels: Record<string, string> = {
      borrador: 'Borrador',
      pendiente: 'Pendiente',
      recibida: 'Recibida',
      cancelada: 'Cancelada'
    };
    return labels[o.estado || ''] || o.estado || '—';
  }

  estadoClass(o: OrdenCompra): string {
    return o.estado ? `estado-${o.estado}` : '';
  }
}
