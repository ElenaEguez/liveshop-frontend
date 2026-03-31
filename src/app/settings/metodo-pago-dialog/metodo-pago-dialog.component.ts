import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SettingsService, MetodoPago } from '../settings.service';

export interface MetodoPagoDialogData {
  metodo?: MetodoPago;
}

@Component({
  selector: 'app-metodo-pago-dialog',
  templateUrl: './metodo-pago-dialog.component.html',
  styleUrls: ['./metodo-pago-dialog.component.scss'],
})
export class MetodoPagoDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  error = '';
  isEdit: boolean;

  tipoChoices = [
    { value: 'efectivo',      label: 'Efectivo' },
    { value: 'qr',            label: 'QR' },
    { value: 'tarjeta',       label: 'Tarjeta' },
    { value: 'credito',       label: 'Crédito' },
    { value: 'mixto',         label: 'Mixto' },
    { value: 'otro',          label: 'Otro' },
  ];

  iconoChoices = [
    'payments', 'qr_code', 'credit_card', 'account_balance_wallet',
    'account_balance', 'local_atm', 'point_of_sale',
  ];

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: MetodoPagoDialogData,
    private dialogRef: MatDialogRef<MetodoPagoDialogComponent>,
    private svc: SettingsService,
  ) {
    this.isEdit = !!data?.metodo;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: [this.data?.metodo?.nombre || '', Validators.required],
      tipo:   [this.data?.metodo?.tipo   || 'efectivo', Validators.required],
      icono:  [this.data?.metodo?.icono  || 'payments'],
      orden:  [this.data?.metodo?.orden  ?? 0],
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const obs = this.isEdit
      ? this.svc.updateMetodoPago(this.data.metodo!.id, this.form.value)
      : this.svc.createMetodoPago(this.form.value);

    obs.subscribe({
      next: m => this.dialogRef.close(m),
      error: err => { this.error = err.error?.nombre?.[0] || 'Error al guardar.'; this.loading = false; },
    });
  }
}
