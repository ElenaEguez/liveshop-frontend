import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SettingsService, Cupon } from '../settings.service';

@Component({
  selector: 'app-cupon-dialog',
  templateUrl: './cupon-dialog.component.html',
})
export class CuponDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  error = '';
  isEdit: boolean;

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public cupon: Cupon | null,
    private dialogRef: MatDialogRef<CuponDialogComponent>,
    private svc: SettingsService,
  ) {
    this.isEdit = !!cupon;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      codigo:            [this.cupon?.codigo || '', Validators.required],
      tipo:              [this.cupon?.tipo || 'porcentaje', Validators.required],
      valor:             [this.cupon?.valor || 0, [Validators.required, Validators.min(0.01)]],
      usos_maximos:      [this.cupon?.usos_maximos || null],
      fecha_vencimiento: [this.cupon?.fecha_vencimiento || null],
      activo:            [this.cupon?.activo ?? true],
      aplica_live:       [this.cupon?.aplica_live ?? true],
      aplica_pos:        [this.cupon?.aplica_pos ?? true],
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const obs = this.isEdit
      ? this.svc.updateCupon(this.cupon!.id, this.form.value)
      : this.svc.createCupon(this.form.value);
    obs.subscribe({
      next: c => this.dialogRef.close(c),
      error: err => {
        this.error = err.error?.codigo?.[0] || 'Error al guardar.';
        this.loading = false;
      },
    });
  }
}
