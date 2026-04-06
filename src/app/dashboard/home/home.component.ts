import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import {
  DashboardService,
  MovimientoCaja,
  SalesByProduct,
  SalesDashboardData,
  SalesDashboardParams,
  VarianteVenta,
} from '../dashboard.service';
import { Category, CategoryService } from '../../categories/services/category.service';
import { VendorProfileService } from '../../my-store/services/vendor-profile.service';
import { VendorSocketService } from '../../core/vendor-socket.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── State ─────────────────────────────────────────────────────────────────
  loading = false;
  error   = false;

  // ── Filters ───────────────────────────────────────────────────────────────
  selectedPeriod: 'week' | 'month' | 'year' | 'day' = 'month';
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear:  number = new Date().getFullYear();
  selectedDate:  string = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
  selectedCategoryId: number | null = null;

  readonly months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  readonly years: number[] = (() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1];
  })();

  // ── Data ──────────────────────────────────────────────────────────────────
  salesData: SalesDashboardData | null = null;
  categories: Category[] = [];

  // ── Table ─────────────────────────────────────────────────────────────────
  tableDataSource = new MatTableDataSource<SalesByProduct>([]);
  displayedColumns = ['expand', 'product_name', 'category', 'units_sold', 'revenue', 'cost', 'margin'];
  tableFilterCategory = '';

  // ── Variant expansion ─────────────────────────────────────────────────────
  expandedProductId: number | null = null;

  // ── Movimientos de Caja ───────────────────────────────────────────────────
  movimientos: MovimientoCaja[] = [];
  movPage = 1;
  movPages = 1;
  movCount = 0;
  movLoading = false;
  movPeriod = 'today';
  movCols = ['fecha', 'caja', 'tipo', 'usuario', 'detalle', 'monto'];

  @ViewChild(MatSort)      sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // ── Socket ────────────────────────────────────────────────────────────────
  private socketSub?: Subscription;

  constructor(
    private dashboardService:     DashboardService,
    private categoryService:      CategoryService,
    private vendorProfileService: VendorProfileService,
    private vendorSocket:         VendorSocketService,
    public  router:               Router
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadCategories();
    this.loadSalesDashboard();
    this.loadMovimientos();
    this.connectSocket();
  }

  ngAfterViewInit(): void {
    this.tableDataSource.sort      = this.sort;
    this.tableDataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void {
    this.socketSub?.unsubscribe();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: cats => (this.categories = cats),
      error: ()  => {}
    });
  }

  loadSalesDashboard(): void {
    this.loading = true;
    this.error   = false;
    this.expandedProductId = null;

    const params: SalesDashboardParams = {
      period: this.selectedPeriod,
      ...(this.selectedCategoryId != null && { category_id: this.selectedCategoryId })
    };

    if (this.selectedPeriod === 'day') {
      params.date = this.selectedDate;
    } else {
      params.year = this.selectedYear;
      if (this.selectedPeriod !== 'year') {
        params.month = this.selectedMonth;
      }
    }

    this.dashboardService.getSalesDashboard(params).subscribe({
      next: data => {
        this.salesData = data;
        this.tableFilterCategory = '';
        this.tableDataSource.data = [...data.sales_by_product];
        this.loading = false;
      },
      error: () => {
        this.error   = true;
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadSalesDashboard();
  }

  loadMovimientos(page = 1): void {
    this.movLoading = true;
    this.movPage = page;
    this.dashboardService.getMovimientosCaja(this.movPeriod, page, 10).subscribe({
      next: res => {
        this.movimientos = res.results;
        this.movCount = res.count;
        this.movPages = res.pages;
        this.movLoading = false;
      },
      error: () => { this.movLoading = false; },
    });
  }

  descargarXLSX(): void {
    // Fetch all records for current period (large page_size)
    this.dashboardService.getMovimientosCaja(this.movPeriod, 1, 10000).subscribe({
      next: res => {
        const rows = res.results.map(m => ({
          'Fecha': m.fecha,
          'Caja': m.caja,
          'Tipo': m.tipo,
          'Usuario': m.usuario,
          'Detalle': m.detalle,
          'Monto (Bs.)': m.monto,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
        const periodoLabel: Record<string, string> = {
          today: 'hoy', week: 'semana', month: 'mes', year: 'año'
        };
        const suffix = periodoLabel[this.movPeriod] || this.movPeriod;
        XLSX.writeFile(wb, `movimientos_caja_${suffix}.xlsx`);
      },
      error: () => {},
    });
  }

  setMovPeriod(p: string): void {
    this.movPeriod = p;
    this.loadMovimientos(1);
  }

  movTipoBadgeClass(tipo: string): string {
    tipo = tipo.toLowerCase();
    if (tipo === 'apertura') return 'badge-apertura';
    if (tipo.includes('cierre')) return 'badge-cierre';
    if (tipo === 'ingresoventa') return 'badge-venta';
    if (tipo === 'ingreso') return 'badge-ingreso';
    if (tipo === 'egreso') return 'badge-egreso';
    return '';
  }

  // ── Table local filter ────────────────────────────────────────────────────

  applyTableFilter(): void {
    if (!this.salesData) return;
    this.tableDataSource.data = this.tableFilterCategory
      ? this.salesData.sales_by_product.filter(p => p.category === this.tableFilterCategory)
      : [...this.salesData.sales_by_product];
  }

  // ── Variant expansion ─────────────────────────────────────────────────────

  toggleVariants(row: SalesByProduct): void {
    this.expandedProductId = this.expandedProductId === row.product_id ? null : row.product_id;
  }

  getVariantes(row: SalesByProduct): VarianteVenta[] {
    return row.variantes ?? [];
  }

  // ── Chart helpers ─────────────────────────────────────────────────────────

  get maxRevenue(): number {
    if (!this.salesData?.sales_by_period?.length) return 1;
    return (
      Math.max(...this.salesData.sales_by_period.map(d => parseFloat(d.revenue) || 0)) || 1
    );
  }

  getBarWidth(revenue: string): number {
    return Math.round((parseFloat(revenue) / this.maxRevenue) * 100);
  }

  // ── Gastos helpers ────────────────────────────────────────────────────────

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

  // ── WebSocket ─────────────────────────────────────────────────────────────

  private connectSocket(): void {
    this.socketSub = this.vendorSocket.events
      .pipe(
        filter(e =>
          [
            'payment_submitted', 'payment_confirmed', 'payment_rejected',
            'new_order', 'order_status_changed', 'venta_pos',
          ].includes(e.type)
        ),
        debounceTime(400)
      )
      .subscribe(() => this.loadSalesDashboard());

    this.vendorProfileService.getProfile().subscribe({
      next: profile => this.vendorSocket.connect(profile.id),
      error: () => {}
    });
  }
}
