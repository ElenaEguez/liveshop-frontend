import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PosService, VentaPOS, Sucursal } from '../pos.service';
import { TicketPreviewDialogComponent } from '../ticket-preview/ticket-preview-dialog.component';
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
  metodoPagoTipos = [
    { value: '', label: 'Todos' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'qr', label: 'QR' },
    { value: 'billetera', label: 'Billetera' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'tarjeta', label: 'Tarjeta' },
    { value: 'credito', label: 'Crédito' },
  ];
  filters = {
    periodo: 'hoy',
    sucursal_id: null as number | null,
    status: '',
    cajero_id: null as number | null,
    metodo_pago_tipo: '',
  };
  resumen = { total_ventas: '0', total_cobrado: '0', cantidad_ventas: 0 };

  displayedColumns = ['numero_ticket', 'fecha', 'cliente', 'productos', 'total', 'monto_cobrado', 'metodo', 'cajero', 'status', 'acciones'];

  today = new Date().toISOString().substring(0, 10);

  constructor(
    private posService: PosService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.posService.getSucursales().subscribe(s => this.sucursales = s);
    this.load();
  }

  load(): void {
    this.loading = true;
    const periodoMap: Record<string, string> = {
      hoy: 'today', '7d': 'week', '30d': 'month', año: 'year',
    };
    const periodoApi = periodoMap[this.filters.periodo] || 'today';
    this.posService.getVentas({
      periodo:     periodoApi,
      sucursal_id: this.filters.sucursal_id ?? undefined,
      status:      this.filters.status || undefined,
      cajero_id:   this.filters.cajero_id ?? undefined,
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
      metodo_pago_tipo: this.filters.metodo_pago_tipo || undefined,
    }).subscribe({
      next: res => (this.resumen = res),
      error: () => {},
    });

    // Cargar cajeros desde turnos del periodo (no depende de ventas de la página actual)
    this.posService.getTurnos(periodoApi).subscribe({
      next: turnos => {
        const map = new Map<number, string>();
        for (const t of turnos || []) {
          const id = t?.usuario;
          if (!id) continue;
          const nombre = t?.usuario_nombre || t?.usuario_email || `Usuario ${id}`;
          if (!map.has(id)) map.set(id, nombre);
        }
        this.cajeros = Array.from(map.entries())
          .map(([id, nombre]) => ({ id, nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
      },
      error: () => {},
    });
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }

  verDetalle(venta: VentaPOS): void {
    this.dialog.open(TicketPreviewDialogComponent, {
      data: { venta, vendorName: '', moneda: 'Bs.', showNuevaVenta: false },
      width: '420px',
    });
  }

  reimprimir(venta: VentaPOS): void {
    this.dialog.open(TicketPreviewDialogComponent, {
      data: { venta, vendorName: '', moneda: 'Bs.', showNuevaVenta: false },
      width: '420px',
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
      data: { venta, moneda: 'Bs.' },
      disableClose: true,
    });
    ref.afterClosed().subscribe(result => {
      if (result?.ventaActualizada) {
        const idx = this.ventas.findIndex(v => v.id === venta.id);
        if (idx >= 0) {
          this.ventas[idx] = result.ventaActualizada;
          // Crear nuevo array para que Angular detecte el cambio en la tabla
          this.ventas = [...this.ventas];
        }
      }
    });
  }

  isHoy(venta: VentaPOS): boolean {
    return venta.created_at.substring(0, 10) === this.today;
  }

  productosResumen(v: VentaPOS): string {
    if (!v.items?.length) return '—';
    return v.items
      .map(i => `${i.product_name || 'Producto'} x${i.cantidad}`)
      .join(', ');
  }
}
