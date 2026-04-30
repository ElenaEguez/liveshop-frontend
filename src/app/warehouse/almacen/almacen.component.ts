import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WarehouseService, KardexMovimiento } from '../warehouse.service';
import { KardexAjusteDialogComponent } from '../kardex-ajuste-dialog/kardex-ajuste-dialog.component';

@Component({
  selector: 'app-almacen',
  templateUrl: './almacen.component.html',
  styleUrls: ['./almacen.component.scss'],
})
export class AlmacenComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  movimientos: KardexMovimiento[] = [];
  totalCount = 0;
  pageSize = 20;
  pageIndex = 0;
  loading = false;

  sucursales: any[] = [];
  almacenes: any[] = [];
  inventories: any[] = [];
  productQuery = '';

  filters = {
    periodo: 'todo',
    fecha_desde: '',
    fecha_hasta: '',
    product_id: null as number | null,
    almacen_id: null as number | null,
    tipo: '',
  };

  displayedColumns = [
    'fecha', 'almacen', 'motivo', 'tipo',
    'documento', 'cantidad', 'producto',
    'stock_anterior', 'stock_actual', 'costo_promedio', 'usuario',
  ];

  constructor(
    private svc: WarehouseService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.svc.getSucursales().subscribe(s => this.sucursales = s);
    this.svc.getAlmacenes().subscribe(a => this.almacenes = a);
    this.svc.getInventories().subscribe(i => this.inventories = i);
    this.load();
  }

  get filteredInventories(): any[] {
    const q = this.productQuery.trim().toLowerCase();
    if (!q) return this.inventories;
    return this.inventories.filter(inv =>
      String(inv.product_name || '').toLowerCase().includes(q)
    );
  }

  onProductInputChange(): void {
    if (!this.productQuery.trim()) {
      this.filters.product_id = null;
      this.resetPage();
    }
  }

  selectProductFilter(inv: any): void {
    this.productQuery = inv?.product_name || '';
    this.filters.product_id = inv?.product ?? null;
    this.resetPage();
  }

  buildDateFilters(): { fecha_desde?: string; fecha_hasta?: string } {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().substring(0, 10);
    switch (this.filters.periodo) {
      case 'hoy':
        return { fecha_desde: fmt(today), fecha_hasta: fmt(today) };
      case '7d': {
        const d = new Date(today); d.setDate(d.getDate() - 7);
        return { fecha_desde: fmt(d), fecha_hasta: fmt(today) };
      }
      case '30d': {
        const d = new Date(today); d.setDate(d.getDate() - 30);
        return { fecha_desde: fmt(d), fecha_hasta: fmt(today) };
      }
      case 'año': {
        const d = new Date(today.getFullYear(), 0, 1);
        return { fecha_desde: fmt(d), fecha_hasta: fmt(today) };
      }
      case 'dia':
        return { fecha_desde: this.filters.fecha_desde, fecha_hasta: this.filters.fecha_hasta };
      default:
        return {};
    }
  }

  load(): void {
    this.loading = true;
    const dateF = this.buildDateFilters();
    this.svc.getKardex({
      product_id:  this.filters.product_id ?? undefined,
      almacen_id:  this.filters.almacen_id ?? undefined,
      tipo:        this.filters.tipo || undefined,
      page:        this.pageIndex + 1,
      page_size:   this.pageSize,
      ...dateF,
    }).subscribe({
      next: res => {
        this.movimientos = res.results;
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

  resetPage(): void {
    this.pageIndex = 0;
    this.load();
  }

  abrirAjuste(): void {
    const ref = this.dialog.open(KardexAjusteDialogComponent, { width: '480px', disableClose: true });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.snack.open('Ajuste registrado.', 'OK', { duration: 3000 });
        this.load();
      }
    });
  }

  descargarXLSX(): void {
    // CSV download (Excel-compatible)
    const headers = [
      'Fecha', 'Producto', 'Almacén', 'Tipo', 'Motivo',
      'Cantidad', 'Stock Anterior', 'Stock Actual', 'Costo Promedio', 'Notas'
    ];
    const rows = this.movimientos.map(m => [
      new Date(m.created_at).toLocaleString('es-BO'),
      m.product_name,
      m.almacen_nombre || '',
      m.tipo,
      m.motivo,
      m.cantidad,
      m.stock_anterior,
      m.stock_actual,
      m.costo_promedio || '',
      m.notas,
    ]);

    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kardex_${new Date().toISOString().substring(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  tipoClass(tipo: string): string {
    return tipo === 'entrada' ? 'chip-entrada'
         : tipo === 'salida'  ? 'chip-salida'
         : tipo === 'ajuste'  ? 'chip-ajuste'
         : 'chip-transfer';
  }

  tipoLabel(tipo: string): string {
    const map: Record<string,string> = {
      entrada: 'ENTRADA', salida: 'SALIDA', ajuste: 'AJUSTE', transferencia: 'TRANSF.'
    };
    return map[tipo] || tipo.toUpperCase();
  }
}
