import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensesService, CategoriaGasto } from '../expenses.service';
import { GastoDialogComponent } from '../gasto-dialog/gasto-dialog.component';
import { HistorialGastosDialogComponent } from '../historial-gastos-dialog/historial-gastos-dialog.component';
import { PosService } from '../../pos/pos.service';

interface CatRow {
  categoria: CategoriaGasto;
  total: number;
  count: number;
}

@Component({
  selector: 'app-gastos',
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.scss'],
})
export class GastosComponent implements OnInit {
  catRows: CatRow[] = [];
  loading = false;
  activePeriodo = 'todo';
  activeFecha = '';
  showDatePicker = false;
  displayedColumns = ['categoria', 'total', 'acciones'];

  turnos: any[] = [];
  turnosCols = ['caja', 'apertura', 'ventas', 'retiros', 'status'];

  constructor(
    private svc: ExpensesService,
    private posSvc: PosService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private get turnosPeriodo(): string {
    const map: Record<string, string> = {
      '7d': 'week', '30d': 'month', 'año': 'year', 'hoy': 'today', 'todo': 'all',
    };
    return map[this.activePeriodo] || 'today';
  }

  load(): void {
    this.loading = true;
    const periodoMap: Record<string,string> = {
      '7d': 'week', '30d': 'month', 'año': 'year', 'hoy': 'today',
    };

    // Load turno movements alongside expenses
    const tp = this.turnosPeriodo;
    if (tp !== 'all') {
      this.posSvc.getTurnos(tp).subscribe({ next: t => this.turnos = t, error: () => {} });
    } else {
      this.posSvc.getTurnos('month').subscribe({ next: t => this.turnos = t, error: () => {} });
    }

    this.svc.getCategorias().subscribe({
      next: cats => {
        const filters: any = { page_size: 200 };
        if (this.activePeriodo !== 'todo' && this.activePeriodo !== 'dia') {
          filters.periodo = periodoMap[this.activePeriodo];
        }
        if (this.activePeriodo === 'dia' && this.activeFecha) {
          filters.fecha = this.activeFecha;
        }

        this.svc.getGastos(filters).subscribe({
          next: res => {
            // Build totals per category
            const totals = new Map<number | null, { total: number; count: number }>();
            for (const g of res.results) {
              const key = g.categoria ?? null;
              if (!totals.has(key)) totals.set(key, { total: 0, count: 0 });
              const entry = totals.get(key)!;
              entry.total += parseFloat(g.monto);
              entry.count++;
            }

            // For "Sin categoría"
            const sinCat: CategoriaGasto = { id: 0, nombre: 'Sin categoría' };
            const allCats = [...cats];
            if (totals.has(null)) allCats.unshift(sinCat);

            this.catRows = allCats.map(cat => ({
              categoria: cat,
              total: totals.get(cat.id === 0 ? null : cat.id)?.total ?? 0,
              count: totals.get(cat.id === 0 ? null : cat.id)?.count ?? 0,
            })).filter(r => r.total > 0 || cats.includes(r.categoria));

            this.loading = false;
          },
          error: () => { this.loading = false; },
        });
      },
      error: () => { this.loading = false; },
    });
  }

  setPeriodo(p: string): void {
    this.activePeriodo = p;
    this.showDatePicker = p === 'dia';
    if (p !== 'dia') this.load();
  }

  limpiarFiltro(): void {
    this.activePeriodo = 'todo';
    this.activeFecha = '';
    this.showDatePicker = false;
    this.load();
  }

  nuevoGasto(): void {
    const ref = this.dialog.open(GastoDialogComponent, { width: '460px', disableClose: true });
    ref.afterClosed().subscribe(r => { if (r) { this.snack.open('Gasto registrado.', 'OK', { duration: 2000 }); this.load(); } });
  }

  verGastos(row: CatRow): void {
    this.dialog.open(HistorialGastosDialogComponent, {
      width: '760px',
      data: { categoria: row.categoria, periodo: this.activePeriodo, fecha: this.activeFecha },
    });
  }

  eliminarCategoria(row: CatRow): void {
    if (row.categoria.id === 0) return;
    if (!confirm(`¿Eliminar categoría "${row.categoria.nombre}"?`)) return;
    this.svc.deleteCategoria(row.categoria.id).subscribe({
      next: () => { this.snack.open('Categoría eliminada.', 'OK', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('No se puede eliminar: tiene gastos asociados.', 'OK', { duration: 4000 }),
    });
  }
}
