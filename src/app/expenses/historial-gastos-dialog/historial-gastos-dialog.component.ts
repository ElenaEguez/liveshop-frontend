import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensesService, GastoOperativo, CategoriaGasto } from '../expenses.service';

export interface HistorialDialogData {
  categoria: CategoriaGasto;
  periodo: string;
  fecha?: string;
}

@Component({
  selector: 'app-historial-gastos-dialog',
  templateUrl: './historial-gastos-dialog.component.html',
})
export class HistorialGastosDialogComponent implements OnInit {
  gastos: GastoOperativo[] = [];
  loading = false;
  displayedColumns = ['id', 'fecha', 'concepto', 'monto', 'usuario', 'notas', 'status', 'acciones'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: HistorialDialogData,
    private svc: ExpensesService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const periodoMap: Record<string,string> = {
      'todo': '', '7d': 'week', '30d': 'month', 'año': 'year', 'hoy': 'today',
    };
    this.svc.getGastos({
      categoria_id: this.data.categoria.id,
      periodo: periodoMap[this.data.periodo] || undefined,
      fecha: this.data.fecha,
      page_size: 100,
    }).subscribe({
      next: res => { this.gastos = res.results; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  anular(gasto: GastoOperativo): void {
    if (!confirm(`¿Anular el gasto "${gasto.concepto}"?`)) return;
    this.svc.anularGasto(gasto.id).subscribe({
      next: () => {
        this.snack.open('Gasto anulado.', 'OK', { duration: 2000 });
        this.load();
      },
      error: () => this.snack.open('Error al anular.', 'OK', { duration: 3000 }),
    });
  }
}
