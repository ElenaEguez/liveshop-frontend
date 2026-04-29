import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { PosService, Sucursal, Caja } from '../pos.service';

@Component({
  selector: 'app-abrir-caja-dialog',
  templateUrl: './abrir-caja-dialog.component.html',
})
export class AbrirCajaDialogComponent implements OnInit {
  form!: FormGroup;
  sucursales: Sucursal[] = [];
  cajas: Caja[] = [];
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AbrirCajaDialogComponent>,
    private posService: PosService,
    @Inject(MAT_DIALOG_DATA) public data: { sucursal_id?: number | null; caja_id?: number | null } | null,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      sucursal_id:     [null, Validators.required],
      caja_id:         [null, Validators.required],
      monto_apertura:  [0, [Validators.required, Validators.min(0)]],
    });

    this.posService.getSucursales().subscribe(s => {
      this.sucursales = s.filter(x => x.activa);
      if (this.data?.sucursal_id) {
        this.form.patchValue({ sucursal_id: this.data.sucursal_id });
      }
    });

    this.form.get('sucursal_id')!.valueChanges.subscribe(id => {
      if (id) {
        this.cajas = [];
        this.form.get('caja_id')!.reset();
        this.posService.getCajas(id).subscribe(c => {
          this.cajas = c.filter(x => x.activa);
          if (this.data?.caja_id && this.cajas.some(x => x.id === this.data?.caja_id)) {
            this.form.patchValue({ caja_id: this.data.caja_id });
          }
        });
      }
    });
  }

  abrir(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { caja_id, monto_apertura } = this.form.value;
    this.posService.abrirTurno(caja_id, monto_apertura).subscribe({
      next: turno => this.dialogRef.close({ turno, caja_id }),
      error: err => {
        this.error = err.error?.error || 'Error al abrir la caja.';
        this.loading = false;
      },
    });
  }
}
