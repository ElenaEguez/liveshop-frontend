import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SettingsService, Sucursal } from '../settings.service';

@Component({
  selector: 'app-sucursal-dialog',
  templateUrl: './sucursal-dialog.component.html',
  styleUrls: ['./sucursal-dialog.component.scss'],
})
export class SucursalDialogComponent {
  form: FormGroup;
  loading = false;
  error = '';
  isEdit: boolean;

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public dialogData: { sucursal?: Sucursal } | null,
    private dialogRef: MatDialogRef<SucursalDialogComponent>,
    private svc: SettingsService,
  ) {
    this.isEdit = !!dialogData?.sucursal;
    this.form = this.fb.group({
      nombre:    [dialogData?.sucursal?.nombre    || '', Validators.required],
      direccion: [dialogData?.sucursal?.direccion || ''],
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const payload = { ...this.form.value, activa: true };
    const obs = this.isEdit
      ? this.svc.updateSucursal(this.dialogData!.sucursal!.id, payload)
      : this.svc.createSucursal(payload);

    obs.subscribe({
      next: s => this.dialogRef.close(s),
      error: err => {
        this.error = err.error?.nombre?.[0] || err.error?.error || err.error?.detail || 'Error al guardar.';
        this.loading = false;
      },
    });
  }
}
