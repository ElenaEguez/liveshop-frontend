import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import {
  WarehouseExtraService, Transferencia
} from '../services/warehouse-extra.service';

@Component({
  selector: 'app-transferencias-list',
  templateUrl: './transferencias-list.component.html',
  styleUrls: ['./transferencias-list.component.scss']
})
export class TransferenciasListComponent implements OnInit {

  transferencias: Transferencia[] = [];
  cargando = true;
  filtroEstado = '';
  currentPage = 1;
  totalItems = 0;
  pageSize = 10;
  columnas = ['origen', 'destino', 'estado',
    'items', 'fecha', 'acciones'];

  readonly estadosFiltro = [
    { value: '', label: 'Todos' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

  constructor(
    private svc: WarehouseExtraService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    const params: { page: number; page_size: number; estado?: string } = {
      page: this.currentPage,
      page_size: this.pageSize,
    };
    if (this.filtroEstado) {
      params.estado = this.filtroEstado;
    }
    this.svc.getTransferencias(params).subscribe({
      next: (data) => {
        this.transferencias = data?.results ?? [];
        this.totalItems = data?.count ?? 0;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  onFiltroChange(): void {
    this.currentPage = 1;
    this.cargar();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.cargar();
  }

  onNueva(): void {
    this.router.navigate(['/almacen/transferencias/nueva']);
  }

  onVer(id: number): void {
    this.router.navigate(['/almacen/transferencias', id]);
  }

  onEditar(id: number, ev?: Event): void {
    ev?.stopPropagation();
    this.router.navigate(['/almacen/transferencias', id, 'edit']);
  }

  onConfirmar(t: Transferencia, ev?: Event): void {
    ev?.stopPropagation();
    if (!confirm(
      `¿Confirmar transferencia de ${t.almacen_origen_nombre} ` +
      `→ ${t.almacen_destino_nombre}? ` +
      `Esto moverá el stock inmediatamente.`)) { return; }
    this.svc.confirmarTransferencia(t.id!).subscribe({
      next: () => this.cargar(),
      error: (err) => alert(err.error?.error || 'Error al confirmar')
    });
  }

  onCancelar(t: Transferencia, ev?: Event): void {
    ev?.stopPropagation();
    if (!confirm('¿Cancelar esta transferencia?')) { return; }
    this.svc.cancelarTransferencia(t.id!).subscribe({
      next: () => this.cargar(),
      error: (err) => alert(err.error?.error || 'Error al cancelar')
    });
  }

  getColor(estado: string | undefined): string {
    const m: Record<string, string> = {
      pendiente: 'accent',
      completada: 'primary',
      cancelada: 'warn'
    };
    return m[estado || ''] || 'primary';
  }
}
