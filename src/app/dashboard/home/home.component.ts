import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import {
  DashboardService,
  MovimientoCaja,
  ReportingDashboardData,
  SalesByProduct,
  SalesDashboardData,
  SalesDashboardParams,
  VarianteVenta,
  VentaPorProducto,
  VentaPorVariante,
} from '../dashboard.service';
import { Category, CategoryService } from '../../categories/services/category.service';
import { VendorProfileService } from '../../my-store/services/vendor-profile.service';
import { VendorSocketService } from '../../core/vendor-socket.service';
import { OrderService } from '../../orders/services/order.service';
import {
  ProductVariantsSalesDialogComponent,
  ProductVariantsSalesDialogData,
} from './product-variants-sales-dialog.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  loading = false;
  error   = false;

  selectedPeriod: 'week' | 'month' | 'year' | 'day' = 'month';
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear:  number = new Date().getFullYear();
  selectedDate:  string = new Date().toISOString().slice(0, 10);
  selectedCanal: 'todos' | 'live' | 'tienda' | 'web' = 'todos';

  readonly months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  readonly years: number[] = (() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1];
  })();

  salesData: SalesDashboardData | null = null;
  /** Fuente única de ventas (Fase 2, objetivo 2B/2C): reemplaza los números de venta de salesData. */
  reportingData: ReportingDashboardData | null = null;
  reportingError = false;
  /**
   * Mismo filtro que la pestaña Pedidos → Por confirmar (status=confirmed).
   * El número que manda orders/dashboard cuenta pagos submitted e incluye cancelados;
   * ese módulo no se modifica. null = todavía no llegó la consulta.
   */
  pendingConfirmationCount: number | null = null;
  categories: Category[] = [];

  movimientos: MovimientoCaja[] = [];
  movimientosLoading = false;
  movimientosPage = 1;
  movimientosPages = 1;
  movimientosCount = 0;
  movDisplayedColumns = ['fecha', 'caja', 'tipo', 'usuario', 'detalle', 'monto'];

  tableDataSource = new MatTableDataSource<SalesByProduct>([]);
  displayedColumns = ['product_name', 'category', 'units_sold', 'revenue', 'detalle'];
  tableFilterCategory = '';
  tableFilterTalla = '';
  tableFilterColor = '';

  get tallaOptions(): string[] {
    if (!this.salesData) return [];
    const set = new Set<string>();
    this.salesData.sales_by_product.forEach(p =>
      (p.variantes ?? []).forEach(v => {
        const m = v.variante?.match(/Talla\s+([^/]+)/i);
        if (m) set.add(m[1].trim());
      })
    );
    return Array.from(set).sort();
  }

  get colorOptions(): string[] {
    if (!this.salesData) return [];
    const set = new Set<string>();
    this.salesData.sales_by_product.forEach(p =>
      (p.variantes ?? []).forEach(v => {
        const m = v.variante?.match(/Color\s+([^/]+)/i);
        if (m) set.add(m[1].trim());
      })
    );
    return Array.from(set).sort();
  }

  private productSort?: MatSort;
  private productPaginator?: MatPaginator;

  /** Enlaza sort/paginator cuando el *ngIf del dashboard ya renderizó la tabla. */
  @ViewChild(MatSort) set matSort(sort: MatSort | undefined) {
    this.productSort = sort;
    if (sort) {
      this.tableDataSource.sort = sort;
    }
  }

  @ViewChild(MatPaginator) set matPaginator(paginator: MatPaginator | undefined) {
    this.productPaginator = paginator;
    if (paginator) {
      this.tableDataSource.paginator = paginator;
    }
  }

  private socketSub?: Subscription;

  constructor(
    private dashboardService:     DashboardService,
    private categoryService:      CategoryService,
    private vendorProfileService: VendorProfileService,
    private vendorSocket:         VendorSocketService,
    private orderService:         OrderService,
    private dialog:               MatDialog,
    public  router:               Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadSalesDashboard();
    this.connectSocket();
  }

  ngOnDestroy(): void {
    this.socketSub?.unsubscribe();
  }

  private loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: cats => (this.categories = cats),
      error: ()  => {}
    });
  }

  loadSalesDashboard(): void {
    this.loading = true;
    this.error   = false;
    const params: SalesDashboardParams = {
      period: this.selectedPeriod,
      canal: this.selectedCanal,
    };

    if (this.selectedPeriod === 'day') {
      params.date = this.selectedDate;
    } else {
      params.year = this.selectedYear;
      if (this.selectedPeriod !== 'year') {
        params.month = this.selectedMonth;
      }
    }

    this.loadPendingConfirmation();
    this.loadReportingDashboard();
    this.dashboardService.getSalesDashboard(params).subscribe({
      next: data => {
        this.salesData = data;
        this.tableFilterCategory = '';
        this.tableFilterTalla = '';
        this.tableFilterColor = '';
        this.tableDataSource.data = [...data.sales_by_product];
        this.loading = false;
        setTimeout(() => this.reconnectProductsTable(), 0);
        this.loadMovimientosCaja(1);
      },
      error: () => {
        this.error   = true;
        this.loading = false;
      }
    });
  }

  /** Rango [desde, hasta] equivalente al period/year/month/date actual, en YYYY-MM-DD. */
  private periodoADesdeHasta(): { desde: string; hasta: string } {
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (this.selectedPeriod === 'day') {
      return { desde: this.selectedDate, hasta: this.selectedDate };
    }
    if (this.selectedPeriod === 'year') {
      return { desde: `${this.selectedYear}-01-01`, hasta: `${this.selectedYear}-12-31` };
    }
    if (this.selectedPeriod === 'week') {
      const now = new Date();
      const weekday = (now.getDay() + 6) % 7; // lunes = 0
      const start = new Date(now);
      start.setDate(now.getDate() - weekday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { desde: fmt(start), hasta: fmt(end) };
    }
    // month (default)
    const ultimoDia = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    const mm = String(this.selectedMonth).padStart(2, '0');
    return {
      desde: `${this.selectedYear}-${mm}-01`,
      hasta: `${this.selectedYear}-${mm}-${String(ultimoDia).padStart(2, '0')}`,
    };
  }

  /** Fuente única de ventas (Fase 2, objetivo 2B/2C): tarjetas de ingreso, grafico, producto/variante y metodo de pago. */
  loadReportingDashboard(): void {
    this.reportingError = false;
    const { desde, hasta } = this.periodoADesdeHasta();
    this.dashboardService
      .getReportingDashboard({ desde, hasta, canal: this.selectedCanal })
      .subscribe({
        next: data => { this.reportingData = data; },
        error: () => {
          this.reportingData = null;
          this.reportingError = true;
        },
      });
  }

  onPeriodChange(): void {
    this.applyFilters();
  }

  onCanalChange(): void {
    this.applyFilters();
  }

  onDateFiltersChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.loadSalesDashboard();
  }

  resetFilters(): void {
    const now = new Date();
    this.selectedPeriod = 'month';
    this.selectedMonth = now.getMonth() + 1;
    this.selectedYear = now.getFullYear();
    this.selectedDate = now.toISOString().slice(0, 10);
    this.selectedCanal = 'todos';
    this.loadSalesDashboard();
  }

  applyTableFilter(): void {
    if (!this.salesData) return;
    let data = [...this.salesData.sales_by_product];

    if (this.tableFilterCategory) {
      data = data.filter(p => p.category === this.tableFilterCategory);
    }

    if (this.tableFilterTalla) {
      const talla = this.escapeRegExp(this.tableFilterTalla);
      data = data.filter(p =>
        (p.variantes ?? []).some(v =>
          v.variante?.match(new RegExp(`Talla\\s+${talla}`, 'i'))
        )
      );
    }

    if (this.tableFilterColor) {
      const color = this.escapeRegExp(this.tableFilterColor);
      data = data.filter(p =>
        (p.variantes ?? []).some(v =>
          v.variante?.match(new RegExp(`Color\\s+${color}`, 'i'))
        )
      );
    }

    this.tableDataSource.data = data;
    this.productPaginator?.firstPage();
  }

  /** Re-enlaza paginator/sort tras cargar datos (la tabla vive dentro de *ngIf). */
  private reconnectProductsTable(): void {
    if (this.productSort) {
      this.tableDataSource.sort = this.productSort;
    }
    if (this.productPaginator) {
      this.tableDataSource.paginator = this.productPaginator;
      this.productPaginator.firstPage();
    }
  }

  resetTableFilters(): void {
    this.tableFilterCategory = '';
    this.tableFilterTalla = '';
    this.tableFilterColor = '';
    this.applyTableFilter();
  }

  /** Filas visibles en móvil; misma página que MatPaginator de la tabla. */
  get mobileProductRows(): SalesByProduct[] {
    const data = this.tableDataSource.filteredData?.length
      ? this.tableDataSource.filteredData
      : this.tableDataSource.data;
    const p = this.productPaginator;
    if (!p) return data;
    const start = p.pageIndex * p.pageSize;
    return data.slice(start, start + p.pageSize);
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getVariantes(row: SalesByProduct): VarianteVenta[] {
    return row.variantes ?? [];
  }

  openVariantesDialog(row: SalesByProduct): void {
    const data: ProductVariantsSalesDialogData = {
      productName: row.product_name,
      periodLabel: this.salesData?.period_label ?? '',
      variantes: this.getVariantes(row),
    };
    this.dialog.open(ProductVariantsSalesDialogComponent, {
      data,
      width: '520px',
      maxWidth: '95vw',
    });
  }

  get canalOrders(): number {
    if (!this.salesData) return 0;
    if (this.selectedCanal === 'tienda') return this.salesData.pos_total_orders || 0;
    if (this.selectedCanal === 'web')    return this.salesData.web_total_orders || 0;
    if (this.selectedCanal === 'live')   return this.liveOrders;
    if (this.salesData.canal === 'todos') return this.salesData.total_orders || 0;
    return this.liveOrders + (this.salesData.pos_total_orders || 0) + (this.salesData.web_total_orders || 0);
  }

  get canalRevenue(): number {
    if (!this.salesData) return 0;
    if (this.selectedCanal === 'tienda') return +this.salesData.pos_total_revenue || 0;
    if (this.selectedCanal === 'web')    return +this.salesData.web_total_revenue || 0;
    if (this.selectedCanal === 'live')   return this.liveRevenue;
    if (this.salesData.canal === 'todos') return +this.salesData.total_revenue || 0;
    return this.liveRevenue + (+this.salesData.pos_total_revenue || 0) + (+this.salesData.web_total_revenue || 0);
  }

  get liveOrders(): number {
    if (!this.salesData) return 0;
    if (this.salesData.canal !== 'todos') return this.salesData.total_orders || 0;
    const live = (this.salesData.total_orders || 0)
      - (this.salesData.pos_total_orders || 0)
      - (this.salesData.web_total_orders || 0);
    return Math.max(0, live);
  }

  get liveRevenue(): number {
    if (!this.salesData) return 0;
    if (this.salesData.canal !== 'todos') return +this.salesData.total_revenue || 0;
    const live = (+this.salesData.total_revenue || 0)
      - (+this.salesData.pos_total_revenue || 0)
      - (+this.salesData.web_total_revenue || 0);
    return Math.max(0, live);
  }

  get canalLabel(): string {
    const labels: Record<string, string> = {
      live: 'Live (online)', tienda: 'Tienda física', web: 'Web', todos: 'Todos los canales'
    };
    return labels[this.selectedCanal] || 'Todos los canales';
  }

  get maxRevenue(): number {
    if (!this.reportingData?.ventas_por_periodo?.length) return 1;
    return (
      Math.max(...this.reportingData.ventas_por_periodo.map(d => parseFloat(d.ingreso) || 0)) || 1
    );
  }

  getBarWidth(ingreso: string): number {
    return Math.round((parseFloat(ingreso) / this.maxRevenue) * 100);
  }

  get maxGasto(): number {
    if (!this.salesData?.gastos_por_categoria?.length) return 1;
    return Math.max(...this.salesData.gastos_por_categoria.map(g => parseFloat(g.total) || 0)) || 1;
  }

  getGastoBarWidth(total: string): number {
    return Math.round((parseFloat(total) / this.maxGasto) * 100);
  }

  get utilidadNetaPositiva(): boolean {
    return parseFloat(this.salesData?.utilidad_neta ?? '0') >= 0;
  }

  get showMissingCostWarning(): boolean {
    return !!this.salesData?.missing_cost_data;
  }

  get metodosPagoArray(): { nombre: string; monto: number; cantidad: number }[] {
    const lista = this.reportingData?.ventas_por_metodo_pago;
    if (!lista) return [];
    return lista
      .map(v => ({
        nombre: v.metodo_pago,
        monto: Number(v.ingreso) || 0,
        cantidad: v.cantidad_documentos,
      }))
      .sort((a, b) => b.monto - a.monto);
  }

  // ── Fuente única de ventas (Fase 2, objetivo 2D) ────────────────────────
  get ingresoVentas(): number {
    return Number(this.reportingData?.ingreso_ventas ?? 0);
  }

  get porVerificarMonto(): number {
    return Number(this.reportingData?.por_verificar?.monto ?? 0);
  }

  get porVerificarCantidad(): number {
    return this.reportingData?.por_verificar?.cantidad ?? 0;
  }

  get devolucionesMonto(): number {
    return Number(this.reportingData?.devoluciones ?? 0);
  }

  get ingresoNeto(): number {
    return Number(this.reportingData?.ingreso_neto ?? 0);
  }

  get costoVentas(): number | null {
    return this.reportingData?.costo != null ? Number(this.reportingData.costo) : null;
  }

  get utilidadBrutaNueva(): number | null {
    const v = this.reportingData?.utilidad_bruta;
    return v != null ? Number(v) : null;
  }

  get pctVentasConCosto(): number {
    return Number(this.reportingData?.pct_ventas_con_costo ?? 100);
  }

  get mostrarAvisoCostoIncompleto(): boolean {
    return this.pctVentasConCosto < 100;
  }

  get ventasPorProductoNuevo(): VentaPorProducto[] {
    return this.reportingData?.ventas_por_producto ?? [];
  }

  get ventasPorVarianteNuevo(): VentaPorVariante[] {
    return this.reportingData?.ventas_por_variante ?? [];
  }

  get maxMetodoMonto(): number {
    const arr = this.metodosPagoArray;
    return arr.length ? Math.max(...arr.map(m => m.monto)) || 1 : 1;
  }

  getMetodoIcon(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('efectivo')) return 'payments';
    if (n.includes('qr') || n.includes('tigo') || n.includes('billetera')) return 'qr_code';
    if (n.includes('tarjeta') || n.includes('débito') || n.includes('crédito')) return 'credit_card';
    if (n.includes('transfer')) return 'account_balance';
    return 'attach_money';
  }

  get flujoIngresosCaja(): number {
    return +(this.salesData?.total_ingresos_caja ?? 0);
  }

  get flujoRetirosCaja(): number {
    return +(this.salesData?.total_retiros_caja ?? 0);
  }

  get flujoContadoArqueo(): number {
    return +(this.salesData?.ingresos_contado_arqueo ?? 0);
  }

  get flujoEsperadoArqueo(): number {
    return +(this.salesData?.efectivo_esperado_arqueo ?? 0);
  }

  get showFlujoCaja(): boolean {
    if (!this.salesData) return false;
    return (
      this.flujoIngresosCaja > 0
      || this.flujoRetirosCaja > 0
      || this.flujoContadoArqueo > 0
      || this.flujoEsperadoArqueo > 0
    );
  }

  loadMovimientosCaja(page = 1): void {
    this.movimientosLoading = true;
    this.movimientosPage = page;
    const movParams: {
      period: string;
      date?: string;
      year?: number;
      month?: number;
      page: number;
      pageSize: number;
    } = {
      period: this.mapPeriodToMovimientos(),
      page,
      pageSize: 10,
    };
    if (this.selectedPeriod === 'day') {
      movParams.period = 'day';
      movParams.date = this.selectedDate;
    } else {
      movParams.year = this.selectedYear;
      if (this.selectedPeriod !== 'year') {
        movParams.month = this.selectedMonth;
      }
    }
    this.dashboardService.getMovimientosCaja(movParams).subscribe({
      next: res => {
        this.movimientos = res.results;
        this.movimientosCount = res.count;
        this.movimientosPages = res.pages;
        this.movimientosLoading = false;
      },
      error: () => {
        this.movimientosLoading = false;
      },
    });
  }

  movimientosPrev(): void {
    if (this.movimientosPage > 1) {
      this.loadMovimientosCaja(this.movimientosPage - 1);
    }
  }

  movimientosNext(): void {
    if (this.movimientosPage < this.movimientosPages) {
      this.loadMovimientosCaja(this.movimientosPage + 1);
    }
  }

  private mapPeriodToMovimientos(): string {
    if (this.selectedPeriod === 'day') return 'day';
    if (this.selectedPeriod === 'week') return 'week';
    if (this.selectedPeriod === 'month') return 'month';
    return 'year';
  }

  /** Misma condición que OrderListComponent.loadPendingCount: reservas status=confirmed. */
  private loadPendingConfirmation(): void {
    this.orderService.getOrders({ status: 'confirmed', page: 1, page_size: 1 }).subscribe({
      next: res => {
        this.pendingConfirmationCount = res.count;
      },
      error: () => {
        this.pendingConfirmationCount = null;
      },
    });
  }

  get pendingPaymentHint(): string {
    if (this.salesData?.pending_payment_scope === 'actual') {
      return 'Estado actual (no depende del período seleccionado)';
    }
    return 'Pendientes de confirmación';
  }

  formatMovFecha(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-BO', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  movBadgeClass(tipo: string): string {
    const t = (tipo || '').toLowerCase();
    if (t === 'apertura') return 'badge-apertura';
    if (t.includes('cierre')) return 'badge-cierre';
    if (t.includes('venta') || t.includes('cobro')) return 'badge-venta';
    if (t === 'ingreso') return 'badge-ingreso';
    return 'badge-egreso';
  }

  movMontoClass(tipo: string): string {
    return this.isMovIngreso(tipo) ? 'mov-ingreso' : 'mov-egreso';
  }

  isMovIngreso(tipo: string): boolean {
    const t = (tipo || '').toUpperCase();
    if (t === 'EGRESO') return false;
    return (
      t === 'APERTURA'
      || t === 'INGRESO'
      || t === 'INGRESOVENTA'
      || t === 'COBRO_CREDITO'
      || t.includes('CIERRE')
    );
  }

  movTipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      apertura: 'Apertura',
      INGRESOVENTA: 'Venta',
      INGRESO: 'Ingreso',
      EGRESO: 'Retiro',
      COBRO_CREDITO: 'Abono crédito',
    };
    if (tipo?.toLowerCase().includes('cierre')) return 'Cierre';
    return labels[tipo] || tipo || '—';
  }

  private connectSocket(): void {
    this.socketSub = this.vendorSocket.events
      .pipe(debounceTime(400))
      .subscribe(() => {
        this.loadSalesDashboard();
      });

    this.vendorProfileService.getProfile().subscribe({
      next: profile => this.vendorSocket.connect(profile.id),
      error: () => {}
    });
  }
}
