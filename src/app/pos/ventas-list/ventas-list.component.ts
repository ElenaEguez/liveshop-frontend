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
  filters = { periodo: 'hoy', sucursal_id: null as number | null, status: '' };

  displayedColumns = ['numero_ticket', 'fecha', 'cliente', 'total', 'metodo', 'cajero', 'status', 'acciones'];

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
    this.posService.getVentas({
      periodo:     periodoMap[this.filters.periodo] || 'today',
      sucursal_id: this.filters.sucursal_id ?? undefined,
      status:      this.filters.status || undefined,
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
}
