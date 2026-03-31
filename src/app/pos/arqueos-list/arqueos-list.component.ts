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
  page = 1;
  pages = 1;
  count = 0;

  periodos = [
    { value: 'today', label: 'Hoy' },
    { value: 'week',  label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year',  label: 'Año' },
  ];

  displayedColumns = ['fecha', 'caja', 'cajero', 'apertura', 'ventas', 'esperado', 'contado', 'diferencia', 'notas'];

  constructor(private posService: PosService) {}

  ngOnInit(): void { this.load(); }

  load(p = 1): void {
    this.loading = true;
    this.page = p;
    this.posService.getArqueos(this.periodo, p).subscribe({
      next: res => {
        this.turnos = res.results;
        this.count  = res.count;
        this.pages  = res.pages;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  setPeriodo(v: string): void { this.periodo = v; this.load(1); }

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
