import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PosService, TurnoResumen } from '../pos.service';

export interface CerrarCajaDialogData {
  turnoId: number;
}

@Component({
  selector: 'app-cerrar-caja-dialog',
  templateUrl: './cerrar-caja-dialog.component.html',
  styleUrls: ['./cerrar-caja-dialog.component.scss'],
})
export class CerrarCajaDialogComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  resumen: TurnoResumen | null = null;
  loading = false;
  loadingResumen = true;
  error = '';

  diferencia = 0;
  diferenciaAbs = 0;

  private destroy$ = new Subject<void>();

  get efectivoEsperado(): number {
    return this.resumen ? parseFloat(this.resumen.efectivo_esperado) : 0;
  }

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: CerrarCajaDialogData,
    private dialogRef: MatDialogRef<CerrarCajaDialogComponent>,
    private posService: PosService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      monto_cierre: [null, [Validators.required, Validators.min(0)]],
      notas_cierre: [''],
    });

    // Recalculate diferencia every time the counted amount changes
    this.form.get('monto_cierre')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calcularDiferencia());

    this.posService.getResumenTurno(this.data.turnoId).subscribe({
      next: r => {
        this.resumen = r;
        this.loadingResumen = false;
        this.calcularDiferencia();
      },
      error: () => { this.loadingResumen = false; },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private calcularDiferencia(): void {
    const raw = this.form.get('monto_cierre')?.value;
    const cierre = raw !== null && raw !== '' ? Number(raw) : null;
    if (cierre === null || !this.resumen) {
      this.diferencia = 0;
      this.diferenciaAbs = 0;
      return;
    }
    this.diferencia = cierre - this.efectivoEsperado;
    this.diferenciaAbs = Math.abs(this.diferencia);
  }

  get hayConteo(): boolean {
    const v = this.form.get('monto_cierre')?.value;
    return v !== null && v !== '';
  }

  metodoLabel(metodo: string): string {
    if (metodo === 'Sin método') return 'Crédito cobrado';
    return metodo;
  }

  imprimir(): void {
    if (!this.resumen) return;
    const turno = this.resumen.turno;
    const fecha = new Date().toLocaleString('es-BO');
    const conteo = this.form.get('monto_cierre')?.value ?? '—';
    const resultado = !this.hayConteo ? '' :
      this.diferencia === 0 ? 'CUADRADO ✓' :
      this.diferencia < 0 ? `FALTANTE  Bs. ${this.diferenciaAbs.toFixed(2)}` :
      `SOBRANTE  Bs. ${this.diferenciaAbs.toFixed(2)}`;

    const lineas = [
      '================================',
      '       CIERRE DE TURNO DE CAJA',
      '================================',
      `Fecha:    ${fecha}`,
      `Caja:     ${turno.caja ?? '—'}`,
      `Cajero:   ${turno.usuario_nombre ?? '—'}`,
      '--------------------------------',
      `Fondo inicial:   Bs. ${parseFloat(turno.monto_apertura).toFixed(2)}`,
      `Ventas efectivo: Bs. ${parseFloat(this.resumen.total_ventas_efectivo).toFixed(2)}`,
      ...(+this.resumen.total_ingresos > 0 ? [`Ingresos:        Bs. ${parseFloat(this.resumen.total_ingresos).toFixed(2)}`] : []),
      ...(+this.resumen.total_retiros > 0  ? [`Retiros:        -Bs. ${parseFloat(this.resumen.total_retiros).toFixed(2)}`] : []),
      `Efectivo esperado: Bs. ${this.efectivoEsperado.toFixed(2)}`,
      '--------------------------------',
      'VENTAS POR MÉTODO:',
      ...this.resumen.ventas_por_metodo.map(m =>
        `  ${this.metodoLabel(m.metodo)} (${m.cantidad}): Bs. ${parseFloat(m.total).toFixed(2)}`
      ),
      '--------------------------------',
      `Efectivo contado:  Bs. ${Number(conteo).toFixed(2)}`,
      resultado ? resultado : '',
      '================================',
    ].filter(l => l !== '').join('\n');

    const w = window.open('', '_blank', 'width=380,height=600');
    if (!w) return;
    w.document.write(`<html><head><title>Cierre de Caja</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 13px; white-space: pre; padding: 16px; }
        @media print { button { display: none; } }
      </style>
    </head><body><pre>${lineas}</pre>
    <br><button onclick="window.print()">Imprimir</button>
    </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  cerrar(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { monto_cierre, notas_cierre } = this.form.value;
    this.posService.cerrarTurno(this.data.turnoId, monto_cierre, notas_cierre).subscribe({
      next: result => this.dialogRef.close(result),
      error: err => {
        this.error = err.error?.error || 'Error al cerrar la caja.';
        this.loading = false;
      },
    });
  }
}
