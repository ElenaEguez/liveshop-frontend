import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ComprasService, OrdenCompra, Proveedor } from '../compras.service';

@Component({
  selector: 'app-orden-list',
  templateUrl: './orden-list.component.html',
  styleUrls: ['./orden-list.component.scss']
})
export class OrdenListComponent implements OnInit, OnDestroy {
  ordenes: OrdenCompra[] = [];
  proveedores: Proveedor[] = [];
  filtroProveedor: number | null = null;
  filtroEstado = '';
  filtroNumeroInput = '';
  /** Valor enviado al API tras debounce (AND con otros filtros). */
  filtroNumero = '';
  currentPage = 1;
  totalItems = 0;
  pageSize = 10;
  cargando = false;

  private readonly destroy$ = new Subject<void>();
  private readonly numeroSearch$ = new Subject<string>();

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
    this.numeroSearch$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe((valor) => {
      this.filtroNumero = this.normalizarNumeroBusqueda(valor);
      this.currentPage = 1;
      this.cargarOrdenes();
    });

    this.comprasService.getProveedores().subscribe({
      next: (rows) => { this.proveedores = rows || []; },
      error: () => {},
    });
    this.cargarOrdenes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onNumeroBusquedaChange(valor: string): void {
    this.numeroSearch$.next(valor);
  }

  limpiarBusquedaNumero(): void {
    this.filtroNumeroInput = '';
    this.filtroNumero = '';
    this.currentPage = 1;
    this.cargarOrdenes();
  }

  get hayFiltroNumero(): boolean {
    return !!this.filtroNumero;
  }

  get etiquetaNumeroBusqueda(): string {
    const v = this.filtroNumeroInput.trim();
    if (!v) {
      return '';
    }
    return /^OC-/i.test(v) ? v : `OC-${v}`;
  }

  get mensajeSinResultados(): string {
    if (this.hayFiltroNumero) {
      return `Sin resultados para ${this.etiquetaNumeroBusqueda}`;
    }
    return 'Sin órdenes registradas.';
  }

  private normalizarNumeroBusqueda(valor: string): string {
    const raw = (valor || '').trim();
    if (!raw) {
      return '';
    }
    return raw.replace(/^OC-/i, '');
  }

  cargarOrdenes(): void {
    this.cargando = true;
    const params: {
      page: number;
      page_size: number;
      proveedor_id?: number;
      estado?: string;
      numero?: string;
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
    if (this.filtroNumero) {
      params.numero = this.filtroNumero;
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
