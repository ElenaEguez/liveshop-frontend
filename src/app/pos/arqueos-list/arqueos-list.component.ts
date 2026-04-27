import { Component, OnInit } from '@angular/core';
import { PosService, TurnoCaja } from '../pos.service';

@Component({
  selector: 'app-arqueos-list',
  templateUrl: './arqueos-list.component.html',
  styleUrls: ['./arqueos-list.component.scss'],
})
export class ArqueosListComponent implements OnInit {
  turnos: TurnoCaja[] = [];
  loading = false;
  periodo = 'month';
  semana: number | null = null;
  page = 1;
  pages = 1;
  count = 0;
  expandedTurnoId: number | null = null;

  periodos = [
    { value: 'today', label: 'Hoy' },
    { value: 'week',  label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year',  label: 'Año' },
  ];

  semanas = [1, 2, 3, 4, 5];

  displayedColumns = ['fecha', 'caja', 'cajero', 'apertura', 'ventas', 'metodos', 'esperado', 'contado', 'diferencia', 'notas'];

  constructor(private posService: PosService) {}

  ngOnInit(): void { this.load(); }

  load(p = 1): void {
    this.loading = true;
    this.page = p;
    this.posService.getArqueos(this.periodo, p, 20, this.semana).subscribe({
      next: res => {
        this.turnos = res.results;
        this.count  = res.count;
        this.pages  = res.pages;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  setPeriodo(v: string): void {
    this.periodo = v;
    this.semana = null;
    this.load(1);
  }

  setSemana(s: number | null): void {
    this.semana = s;
    this.load(1);
  }

  toggleExpand(t: TurnoCaja): void {
    this.expandedTurnoId = this.expandedTurnoId === t.id ? null : t.id;
  }

  getMetodosArray(turno: TurnoCaja): { nombre: string; monto: number; cantidad: number }[] {
    const map = turno.metodos_pago;
    if (!map) return [];
    return Object.entries(map)
      .map(([nombre, v]) => ({ nombre, monto: v.monto, cantidad: v.cantidad }))
      .sort((a, b) => b.monto - a.monto);
  }

  diferenciaClass(turno: TurnoCaja): string {
    if (turno.diferencia_cierre === null || turno.diferencia_cierre === undefined) return '';
    const d = parseFloat(String(turno.diferencia_cierre));
    if (d < 0) return 'faltante';
    if (d > 0) return 'sobrante';
    return 'cuadrado';
  }

  diferenciaLabel(turno: TurnoCaja): string {
    if (turno.diferencia_cierre === null || turno.diferencia_cierre === undefined) return '—';
    const d = parseFloat(String(turno.diferencia_cierre));
    const abs = Math.abs(d).toFixed(2);
    if (d < 0) return `−Bs. ${abs}`;
    if (d > 0) return `+Bs. ${abs}`;
    return 'Cuadrado';
  }
}
