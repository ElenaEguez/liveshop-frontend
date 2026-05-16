import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { WarehouseService, KardexMovimiento, KardexDetalleVariante } from '../warehouse.service';

@Component({
  selector: 'app-almacen',
  templateUrl: './almacen.component.html',
  styleUrls: ['./almacen.component.scss'],
})
export class AlmacenComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  movimientos: KardexMovimiento[] = [];
  totalCount = 0;
  pageSize = 20;
  pageIndex = 0;
  loading = false;

  sucursales: any[] = [];
  almacenes: any[] = [];
  selectedSucursalId: number | null = null;
  inventories: any[] = [];
  stockVariantes: any[] = [];
  productQuery = '';
  productSearchLoading = false;

  readonly periodoOptions = [
    { v: 'todo', label: 'Todo' },
    { v: 'hoy', label: 'Hoy' },
    { v: '7d', label: '7 días' },
    { v: '30d', label: '30 días' },
    { v: 'año', label: 'Este año' },
    { v: 'dia', label: 'Por día' },
  ];

  private productSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  filters = {
    periodo: 'todo',
    fecha_desde: '',
    fecha_hasta: '',
    product_id: null as number | null,
    almacen_id: null as number | null,
    tipo: '',
  };

  displayedColumns = [
    'fecha', 'documento', 'producto', 'variante', 'almacen',
    'tipo', 'motivo', 'cantidad', 'stock_anterior', 'stock_actual',
    'usuario', 'detalle',
  ];

  private readonly motivoLabels: Record<string, string> = {
    venta: 'Venta',
    venta_live: 'Venta Live',
    venta_web: 'Venta web',
    compra: 'Compra / Reposición',
    ajuste_manual: 'Ajuste manual',
    devolucion: 'Devolución',
    devolucion_compra: 'Devolución a proveedor',
    transferencia: 'Transferencia',
  };

  constructor(
    private svc: WarehouseService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.applyQueryParams(this.route.snapshot.queryParams);

    this.svc.getSucursales().subscribe(s => this.sucursales = s);
    this.svc.getAlmacenes().subscribe(a => {
      this.almacenes = a;
      this.actualizarStockVariantes();
    });

    this.productSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => this.fetchProductOptions(q));

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const prev = this.filters.product_id;
      this.applyQueryParams(params);
      if (this.filters.product_id !== prev) {
        this.pageIndex = 0;
        this.load();
      }
    });

    this.fetchProductOptions('');
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  compareIds = (a: number | null, b: number | null): boolean => a === b;

  get filteredInventories(): any[] {
    return Array.isArray(this.inventories) ? this.inventories : [];
  }

  get almacenesForSelect(): any[] {
    const activos = this.almacenes.filter((a: any) => a.activo !== false);
    if (!this.selectedSucursalId) {
      return activos;
    }
    return activos.filter((a: any) => a.sucursal === this.selectedSucursalId);
  }

  get hasActiveFilters(): boolean {
    return this.filters.periodo !== 'todo'
      || !!this.filters.product_id
      || !!this.filters.almacen_id
      || !!this.filters.tipo
      || !!this.selectedSucursalId;
  }

  private applyQueryParams(params: Record<string, string | undefined>): void {
    const pid = params['product_id'] ? Number(params['product_id']) : null;
    const pname = params['product_name'];
    if (pid) {
      this.filters.product_id = pid;
      this.productQuery = pname || this.productQuery || '';
    }
  }

  onProductInputChange(): void {
    const q = this.productQuery.trim();
    if (!q) {
      this.filters.product_id = null;
      this.syncProductQueryParams();
      this.resetPage();
    }
    this.productSearch$.next(q);
  }

  onProductSelected(inv: { product: number; product_name: string } | null): void {
    this.selectProductFilter(inv);
  }

  selectProductFilter(inv: { product: number; product_name: string } | null): void {
    if (!inv) {
      this.productQuery = '';
      this.filters.product_id = null;
    } else {
      this.productQuery = inv.product_name || '';
      this.filters.product_id = inv.product ?? null;
    }
    this.syncProductQueryParams();
    this.pageIndex = 0;
    this.load();
  }

  private syncProductQueryParams(): void {
    const qp: Record<string, string | number | null> = {
      product_id: this.filters.product_id,
      product_name: this.filters.product_id ? this.productQuery : null,
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  verDetalleProducto(m: KardexMovimiento): void {
    const productId = m.product_id;
    if (!productId) return;
    this.selectProductFilter({
      product: productId,
      product_name: m.product_name,
    });
  }

  setPeriodo(v: string): void {
    this.filters.periodo = v;
    if (v === 'dia' && (!this.filters.fecha_desde || !this.filters.fecha_hasta)) {
      return;
    }
    this.resetPage();
  }

  onSucursalChange(): void {
    if (this.filters.almacen_id != null) {
      const valid = this.almacenesForSelect.some((a: any) => a.id === this.filters.almacen_id);
      if (!valid) {
        this.filters.almacen_id = null;
      }
    }
    this.resetPage();
  }

  onDateRangeChange(): void {
    if (this.filters.periodo !== 'dia') {
      return;
    }
    if (this.filters.fecha_desde && this.filters.fecha_hasta) {
      this.resetPage();
    }
  }

  clearFilters(): void {
    this.filters = {
      periodo: 'todo',
      fecha_desde: '',
      fecha_hasta: '',
      product_id: null,
      almacen_id: null,
      tipo: '',
    };
    this.selectedSucursalId = null;
    this.productQuery = '';
    this.pageIndex = 0;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { product_id: null, product_name: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.load();
  }

  private fetchProductOptions(search: string): void {
    this.productSearchLoading = true;
    this.svc.getInventories(search, search.trim() ? 50 : 100).subscribe({
      next: list => {
        this.inventories = list;
        this.productSearchLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.inventories = [];
        this.productSearchLoading = false;
      },
    });
  }

  private formatLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  buildDateFilters(): { fecha_desde?: string; fecha_hasta?: string } {
    const today = new Date();
    const fmt = (d: Date) => this.formatLocalDate(d);
    switch (this.filters.periodo) {
      case 'hoy':
        return { fecha_desde: fmt(today), fecha_hasta: fmt(today) };
      case '7d': {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        return { fecha_desde: fmt(d), fecha_hasta: fmt(today) };
      }
      case '30d': {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        return { fecha_desde: fmt(d), fecha_hasta: fmt(today) };
      }
      case 'año': {
        const d = new Date(today.getFullYear(), 0, 1);
        return { fecha_desde: fmt(d), fecha_hasta: fmt(today) };
      }
      case 'dia':
        if (this.filters.fecha_desde && this.filters.fecha_hasta) {
          return {
            fecha_desde: this.filters.fecha_desde,
            fecha_hasta: this.filters.fecha_hasta,
          };
        }
        return {};
      default:
        return {};
    }
  }

  private dateFiltersValid(): boolean {
    if (this.filters.periodo !== 'dia') {
      return true;
    }
    const { fecha_desde, fecha_hasta } = this.filters;
    if (fecha_desde && fecha_hasta) {
      if (fecha_desde > fecha_hasta) {
        this.snackBar.open('La fecha «Desde» no puede ser posterior a «Hasta».', 'Cerrar', { duration: 4000 });
        return false;
      }
      return true;
    }
    if (!fecha_desde && !fecha_hasta) {
      this.snackBar.open('Selecciona fecha desde y hasta para filtrar por día.', 'Cerrar', { duration: 4000 });
      return false;
    }
    this.snackBar.open('Completa ambas fechas (desde y hasta).', 'Cerrar', { duration: 4000 });
    return false;
  }

  load(): void {
    if (!this.dateFiltersValid()) {
      return;
    }
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
        const rows = Array.isArray(res) ? res : (res?.results ?? []);
        this.movimientos = rows;
        this.totalCount = Array.isArray(res) ? rows.length : (res?.count ?? rows.length);
        this.actualizarStockVariantes();
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

  motivoLabel(motivo: string): string {
    return this.motivoLabels[motivo] || motivo;
  }

  detalleVariantes(m: KardexMovimiento): KardexDetalleVariante[] {
    return Array.isArray(m.detalle_variantes) ? m.detalle_variantes : [];
  }

  formatCantidadValor(n: number): string {
    const v = Number(n) || 0;
    if (v === 0) return '0';
    return v > 0 ? `+${v}` : `${v}`;
  }

  descargarXLSX(): void {
    const headers = [
      'Fecha', 'Documento', 'Producto', 'Variante', 'Almacén', 'Tipo', 'Motivo',
      'Cantidad', 'St. Anterior', 'St. Actual', 'Detalle', 'Usuario',
    ];
    const rows = this.movimientos.map(m => [
      new Date(m.created_at).toLocaleString('es-BO'),
      m.documento_ref,
      m.product_name,
      m.variant_name || '',
      m.almacen_nombre || '',
      this.tipoLabel(m.tipo),
      this.motivoLabel(m.motivo),
      this.formatCantidad(m),
      m.stock_anterior,
      m.stock_actual,
      this.detalleVariantes(m).map(d =>
        `${d.variant_name}: ${this.formatCantidadValor(d.cantidad)} (${d.stock_anterior}→${d.stock_actual})`,
      ).join('; ') || '',
      m.usuario_nombre || m.usuario_email || '',
    ]);

    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kardex_${this.formatLocalDate(new Date())}.csv`;
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

  formatCantidad(m: KardexMovimiento): string {
    const n = Number(m.cantidad) || 0;
    if (n === 0) return '0';
    if (n > 0) return `+${n}`;
    return `${n}`;
  }

  cantidadEsEntrada(m: KardexMovimiento): boolean {
    const n = Number(m.cantidad) || 0;
    if (n !== 0) return n > 0;
    return m.tipo === 'entrada';
  }

  private actualizarStockVariantes(): void {
    const selectedAlmacen = this.almacenes.find((a: any) => a.id === this.filters.almacen_id);
    let raw = selectedAlmacen?.stock_por_variante;
    let rows = Array.isArray(raw) ? [...raw] : [];
    if (this.filters.product_id != null) {
      rows = rows.filter((r: any) => r.producto_id === this.filters.product_id);
    }
    this.stockVariantes = rows;
    this.cdr.markForCheck();
  }
}
