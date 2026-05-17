import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ComprasService, Proveedor } from '../../compras.service';

export interface ProveedorDialogData {
  proveedor?: Proveedor;
}

@Component({
  selector: 'app-proveedor-dialog',
  templateUrl: './proveedor-dialog.component.html',
  styleUrls: ['./proveedor-dialog.component.scss'],
})
export class ProveedorDialogComponent implements OnInit {
  form!: FormGroup;
  guardando = false;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private comprasService: ComprasService,
    private dialogRef: MatDialogRef<ProveedorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProveedorDialogData,
  ) {
    this.isEdit = !!data?.proveedor?.id;
  }

  ngOnInit(): void {
    const p = this.data?.proveedor;
    this.form = this.fb.group({
      nombre: [p?.nombre ?? '', Validators.required],
      contacto: [p?.contacto ?? ''],
      telefono: [p?.telefono ?? ''],
      email: [p?.email ?? ''],
      notas: [p?.notas ?? ''],
      activo: [p?.activo !== false],
    });
  }

  onCancelar(): void {
    this.dialogRef.close();
  }

  onGuardar(): void {
    if (this.form.invalid || this.guardando) return;
    this.guardando = true;
    const v = this.form.value;
    const op = this.isEdit
      ? this.comprasService.actualizarProveedor(this.data.proveedor!.id!, v)
      : this.comprasService.crearProveedor(v);
    op.subscribe({
      next: (saved) => {
        this.guardando = false;
        this.dialogRef.close(saved);
      },
      error: (err) => {
        this.guardando = false;
        alert(err.error?.detail || err.error?.error || 'Error al guardar');
      },
    });
  }
}
