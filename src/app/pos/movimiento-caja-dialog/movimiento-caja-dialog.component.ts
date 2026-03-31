import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface MovimientoDialogData {
  tipo: 'ingreso' | 'retiro';
}

@Component({
  selector: 'app-movimiento-caja-dialog',
  templateUrl: './movimiento-caja-dialog.component.html',
})
export class MovimientoCajaDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: MovimientoDialogData,
    private dialogRef: MatDialogRef<MovimientoCajaDialogComponent>,
  ) {
    this.form = this.fb.group({
      concepto: ['', Validators.required],
      monto:    [0, [Validators.required, Validators.min(0.01)]],
    });
  }

  confirmar(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }
}
