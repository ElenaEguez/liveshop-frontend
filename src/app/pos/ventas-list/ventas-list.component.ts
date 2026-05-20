import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PosService, VentaPOS, Sucursal } from '../pos.service';
import { TicketPreviewDialogComponent } from '../ticket-preview/ticket-preview-dialog.component';
import { VentaItemsDetailDialogComponent } from '../venta-items-detail-dialog/venta-items-detail-dialog.component';
import { CobrarCreditoDialogComponent } from '../cobrar-credito-dialog/cobrar-credito-dialog.component';

@Component({
  selector: 'app-ventas-list',
  templateUrl: './ventas-list.component.html',
  styleUrls: ['./ventas-list.component.scss'],
})
export class VentasListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ventas: VentaPOS[] = [];
  totalCount = 0;
  pageSize = 20;
  pageIndex = 0;
  loading = false;

  sucursales: Sucursal[] = [];
  cajeros: Array<{ id: number; nombre: string }> = [];
  roles: Array<{ id: number; nombre: string }> = [];
  metodoPagoTipos = [
    { value: '', label: 'Todos' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'qr', label: 'QR' },
    { value: 'tarjeta', label: 'Tarjeta' },
    { value: 'mixto', label: 'Mixto' },
    { value: 'otro', label: 'Otro' },
  ];
  filters = {
    periodo: 'hoy',
    sucursal_id: null as number | null,
    status: '',
    mostrarInactivas: false,
    cajero_id: null as number | null,
    rol_id: null as number | null,
    metodo_pago_tipo: '',
  };
  resumen = { total_ventas: '0', total_cobrado: '0', cantidad_ventas: 0 };

  displayedColumns = ['numero_ticket', 'fecha', 'caja', 'cliente', 'productos', 'total', 'monto_cobrado', 'metodo', 'cajero', 'status', 'acciones'];

  constructor(
    private posService: PosService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.posService.getSucursales().subscribe(s => this.sucursales = s);
    this.loadFiltrosOpciones();
    this.load();
  }

  private periodoApi(): string {
    const periodoMap: Record<string, string> = {
      hoy: 'today', '7d': 'week', '30d': 'month', año: 'year',
    };
    return periodoMap[this.filters.periodo] || 'today';
  }

  loadFiltrosOpciones(): void {
    this.posService.getVentasFiltros({ periodo: this.periodoApi() }).subscribe({
      next: (data) => {
        this.cajeros = data?.cajeros ?? [];
        this.roles = data?.roles ?? [];
        if (
          this.filters.cajero_id != null
          && !this.cajeros.some(c => c.id === this.filters.cajero_id)
        ) {
          this.filters.cajero_id = null;
        }
        if (
          this.filters.rol_id != null
          && !this.roles.some(r => r.id === this.filters.rol_id)
        ) {
          this.filters.rol_id = null;
        }
      },
      error: () => {
        this.cajeros = [];
        this.roles = [];
      },
    });
  }

  load(): void {
    this.loading = true;
    const periodoApi = this.periodoApi();
    this.posService.getVentas({
      periodo:     periodoApi,
      sucursal_id: this.filters.sucursal_id ?? undefined,
      status:      this.filters.status || undefined,
      excluir_inactivas: !this.filters.status && !this.filters.mostrarInactivas,
      cajero_id:   this.filters.cajero_id ?? undefined,
      rol_id:      this.filters.rol_id ?? undefined,
      metodo_pago_tipo: this.filters.metodo_pago_tipo || undefined,
      page:        this.pageIndex + 1,
      page_size:   this.pageSize,
    }).subscribe({
      next: res => {
        this.ventas = res.results;
        this.totalCount = res.count;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });

    this.posService.getVentasResumen({
      periodo: periodoApi,
      sucursal_id: this.filters.sucursal_id ?? undefined,
      status: this.filters.status || undefined,
      cajero_id: this.filters.cajero_id ?? undefined,
      rol_id: this.filters.rol_id ?? undefined,
      metodo_pago_tipo: this.filters.metodo_pago_tipo || undefined,
    }).subscribe({
      next: res => (this.resumen = res),
      error: () => {},
    });

    this.loadFiltrosOpciones();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }

  onMostrarInactivasChange(): void {
    this.pageIndex = 0;
    this.load();
  }

  clearFilters(): void {
    this.filters = {
      periodo: 'hoy',
      sucursal_id: null,
      status: '',
      mostrarInactivas: false,
      cajero_id: null,
      rol_id: null,
      metodo_pago_tipo: '',
    };
    this.pageIndex = 0;
    this.load();
  }

  verDetalle(venta: VentaPOS): void {
    this.dialog.open(VentaItemsDetailDialogComponent, {
      data: { venta },
      width: '640px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      autoFocus: false,
      panelClass: ['dialog-md', 'responsive-dialog'],
    });
  }

  reimprimir(venta: VentaPOS): void {
    this.dialog.open(TicketPreviewDialogComponent, {
      data: { venta, vendorName: '', moneda: 'Bs.', showNuevaVenta: false },
      width: '420px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      autoFocus: false,
      panelClass: 'dialog-sm',
    });
  }

  anular(venta: VentaPOS): void {
    if (!confirm(`¿Anular la venta ${venta.numero_ticket}?`)) return;
    this.posService.anularVenta(venta.id).subscribe({
      next: () => {
        this.snack.open('Venta anulada.', 'OK', { duration: 3000 });
        this.load();
      },
      error: err => {
        this.snack.open(err.error?.error || 'Error al anular.', 'OK', { duration: 4000, panelClass: 'snack-error' });
      },
    });
  }

  cobrarCredito(venta: VentaPOS): void {
    const ref = this.dialog.open(CobrarCreditoDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'dialog-md',
      data: { venta, moneda: 'Bs.' },
      disableClose: true,
    });
    ref.afterClosed().subscribe(result => {
      if (result?.ventaActualizada) {
        const idx = this.ventas.findIndex(v => v.id === venta.id);
        if (idx >= 0) {
          this.ventas[idx] = result.ventaActualizada;
          this.ventas = [...this.ventas];
        }
      }
    });
  }

  puedeAnular(venta: VentaPOS): boolean {
    return venta.status !== 'anulada'
      && venta.status !== 'devuelto'
      && venta.status !== 'parcialmente_devuelto';
  }

  productosResumen(v: VentaPOS): string {
    if (!v.items?.length) return '—';
    return v.items
      .map(i => {
        const variant = i.variant_detail ? ` (${i.variant_detail})` : '';
        return `${i.product_name || 'Producto'}${variant} x${i.cantidad}`;
      })
      .join(', ');
  }
}
