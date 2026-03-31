import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PosService, TurnoResumen } from '../pos.service';

export interface CerrarCajaDialogData {
  turnoId: number;
}

@Component({
  selector: 'app-cerrar-caja-dialog',
  templateUrl: './cerrar-caja-dialog.component.html',
  styleUrls: ['./cerrar-caja-dialog.component.scss'],
})
export class CerrarCajaDialogComponent implements OnInit {
  form!: FormGroup;
  resumen: TurnoResumen | null = null;
  loading = false;
  loadingResumen = true;
  error = '';

  get efectivoEsperado(): number {
    if (!this.resumen) return 0;
    return parseFloat(this.resumen.efectivo_esperado);
  }

  get diferencia(): number {
    if (!this.resumen) return 0;
    const cierre = parseFloat(this.form.get('monto_cierre')?.value || '0');
    return cierre - this.efectivoEsperado;
  }

  get diferenciaAbs(): number {
    return Math.abs(this.diferencia);
  }

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: CerrarCajaDialogData,
    private dialogRef: MatDialogRef<CerrarCajaDialogComponent>,
    private posService: PosService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      monto_cierre: [0, [Validators.required, Validators.min(0)]],
      notas_cierre: [''],
    });

    this.posService.getResumenTurno(this.data.turnoId).subscribe({
      next: r => {
        this.resumen = r;
        this.loadingResumen = false;
      },
      error: () => { this.loadingResumen = false; },
    });
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
