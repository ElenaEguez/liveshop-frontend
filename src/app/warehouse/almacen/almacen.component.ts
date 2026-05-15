import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { WarehouseService, KardexMovimiento } from '../warehouse.service';

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
  inventories: any[] = [];
  stockVariantes: any[] = [];
  productQuery = '';
  productSearchLoading = false;

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
    'fecha', 'documento', 'producto', 'variante',
    'tipo', 'motivo', 'usuario', 'detalle',
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
  ) {}

  ngOnInit(): void {
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
      const pid = params['product_id'] ? Number(params['product_id']) : null;
      const pname = params['product_name'] as string | undefined;
      if (pid) {
        this.filters.product_id = pid;
        this.productQuery = pname || this.productQuery || '';
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

  get filteredInventories(): any[] {
    return Array.isArray(this.inventories) ? this.inventories : [];
  }

  onProductInputChange(): void {
    const q = this.productQuery.trim();
    if (!q) {
      this.filters.product_id = null;
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
    this.pageIndex = 0;
    this.load();
  }

  verDetalleProducto(m: KardexMovimiento): void {
    const productId = m.product_id;
    if (!productId) return;
    this.selectProductFilter({
      product: productId,
      product_name: m.product_name,
    });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { product_id: productId, product_name: m.product_name },
      queryParamsHandling: 'merge',
    });
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

  formatMotivoCompleto(m: KardexMovimiento): string {
    const etiqueta = this.motivoLabels[m.motivo] || m.motivo;
    const qty = this.formatCantidad(m);
    const partes = [etiqueta];
    if (qty && qty !== '0') {
      partes.push(`${qty} uds.`);
    }
    if (m.notas?.trim()) {
      partes.push(m.notas.trim());
    }
    return partes.join(' · ');
  }

  descargarXLSX(): void {
    const headers = [
      'Fecha', 'Documento', 'Producto', 'Variante', 'Tipo', 'Motivo',
      'Usuario',
    ];
    const rows = this.movimientos.map(m => [
      new Date(m.created_at).toLocaleString('es-BO'),
      m.documento_ref,
      m.product_name,
      m.variant_name || '',
      this.tipoLabel(m.tipo),
      this.formatMotivoCompleto(m),
      m.usuario_nombre || m.usuario_email || '',
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

  /** Cantidad con signo: positivo entrada, negativo salida. */
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
    const raw = selectedAlmacen?.stock_por_variante;
    this.stockVariantes = Array.isArray(raw) ? raw : [];
    this.cdr.markForCheck();
  }
}
