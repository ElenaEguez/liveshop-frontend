import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import {
  PosService, TurnoCaja, Sucursal,
  TotalCajero, TotalMetodo,
} from '../pos.service';

interface CajeroOpcion { id: number; nombre: string; }

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

  // Filtros
  sucursales: Sucursal[] = [];
  cajeros: CajeroOpcion[] = [];
  selectedSucursal: number | null = null;
  selectedCajero: number | null = null;

  // Totales
  totalesPorCajero: TotalCajero[] = [];
  totalesPorMetodo: TotalMetodo[] = [];
  mostrarTotales = false;

  periodos = [
    { value: 'today', label: 'Hoy' },
    { value: 'week',  label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year',  label: 'Año' },
  ];

  semanas = [1, 2, 3, 4, 5];

  displayedColumns = ['fecha', 'caja', 'cajero', 'apertura', 'ventas', 'metodos', 'esperado', 'contado', 'diferencia', 'notas'];

  constructor(private posService: PosService) {}

  ngOnInit(): void {
    this.posService.getSucursales().subscribe({
      next: s => { this.sucursales = s.filter(x => x.activa); },
      error: () => {},
    });
    this.load();
  }

  load(p = 1): void {
    this.loading = true;
    this.page = p;
    this.posService.getArqueos(
      this.periodo, p, 20, this.semana,
      this.selectedCajero, this.selectedSucursal,
    ).subscribe({
      next: res => {
        this.turnos            = res.results;
        this.count             = res.count;
        this.pages             = res.pages;
        this.totalesPorCajero  = res.totales_por_cajero ?? [];
        this.totalesPorMetodo  = res.totales_por_metodo ?? [];
        // Construir lista de cajeros únicos para el filtro
        const seen = new Set<number>();
        const list: CajeroOpcion[] = [];
        for (const c of this.totalesPorCajero) {
          if (!seen.has(c.id)) { seen.add(c.id); list.push({ id: c.id, nombre: c.nombre }); }
        }
        if (!this.selectedCajero) this.cajeros = list;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  setPeriodo(v: string): void {
    this.periodo = v;
    this.semana  = null;
    this.load(1);
  }

  setSemana(s: number | null): void {
    this.semana = s;
    this.load(1);
  }

  onSucursalChange(): void { this.selectedCajero = null; this.load(1); }
  onCajeroChange(): void   { this.load(1); }

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

  get totalEfectivo(): number {
    return this.totalesPorMetodo
      .filter(m => m.tipo === 'efectivo')
      .reduce((s, m) => s + parseFloat(m.total), 0);
  }

  get totalQR(): number {
    return this.totalesPorMetodo
      .filter(m => m.tipo === 'qr')
      .reduce((s, m) => s + parseFloat(m.total), 0);
  }

  get totalGeneral(): number {
    return this.totalesPorMetodo.reduce((s, m) => s + parseFloat(m.total), 0);
  }

  descargarXLSX(): void {
    // Descarga todos los registros del período
    this.posService.getArqueos(
      this.periodo, 1, 1000, this.semana,
      this.selectedCajero, this.selectedSucursal,
    ).subscribe({
      next: res => {
        const rows = res.results.map(t => ({
          'Turno (Apertura)': t.fecha_apertura,
          'Cierre': t.fecha_cierre ?? '—',
          'Sucursal': t.sucursal_nombre ?? '—',
          'Caja': t.caja_nombre ?? '—',
          'Cajero': t.usuario_nombre ?? t.usuario_email ?? '—',
          'Fondo Inicial (Bs.)': t.monto_apertura,
          'Ventas (Bs.)': t.total_ventas,
          'Efectivo Esperado (Bs.)': t.efectivo_esperado ?? '—',
          'Contado (Bs.)': t.monto_cierre ?? '—',
          'Diferencia (Bs.)': t.diferencia_cierre ?? '—',
          'Estado': t.status,
          'Notas': t.notas_cierre ?? '',
        }));

        const metodosRows = res.totales_por_metodo.map(m => ({
          'Método': m.nombre,
          'Tipo': m.tipo,
          'Ventas': m.cantidad,
          'Total (Bs.)': m.total,
        }));

        const cajerosRows = res.totales_por_cajero.map(c => ({
          'Cajero': c.nombre,
          'Total (Bs.)': c.total,
          'Efectivo (Bs.)': (c.por_metodo.find(m => m.tipo === 'efectivo')?.total ?? '0'),
          'QR (Bs.)': (c.por_metodo.find(m => m.tipo === 'qr')?.total ?? '0'),
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Arqueos');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metodosRows), 'Por Método');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cajerosRows), 'Por Cajero');

        const etiqueta: Record<string, string> = { today: 'hoy', week: 'semana', month: 'mes', year: 'año' };
        XLSX.writeFile(wb, `arqueos_${etiqueta[this.periodo] ?? this.periodo}.xlsx`);
      },
      error: () => {},
    });
  }
}
