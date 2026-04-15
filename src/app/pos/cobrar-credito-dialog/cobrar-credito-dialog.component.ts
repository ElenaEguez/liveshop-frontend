import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PosService, VentaPOS, PagoCredito, MetodoPago } from '../pos.service';

export interface CobrarCreditoDialogData {
  venta: VentaPOS;
  moneda: string;
}

@Component({
  selector: 'app-cobrar-credito-dialog',
  templateUrl: './cobrar-credito-dialog.component.html',
  styleUrls: ['./cobrar-credito-dialog.component.scss'],
})
export class CobrarCreditoDialogComponent implements OnInit {
  venta: VentaPOS;
  moneda: string;

  pagos: PagoCredito[] = [];
  metodosPago: MetodoPago[] = [];
  loading = false;
  saving = false;

  // Form
  montoNuevo: number | null = null;
  metodoSeleccionado: number | null = null;
  notasNuevo = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: CobrarCreditoDialogData,
    private ref: MatDialogRef<CobrarCreditoDialogComponent>,
    private posService: PosService,
    private snack: MatSnackBar,
  ) {
    this.venta = data.venta;
    this.moneda = data.moneda || 'Bs.';
  }

  ngOnInit(): void {
    this.loadPagos();
    this.posService.getMetodosPago().subscribe(m => { this.metodosPago = m; });
  }

  loadPagos(): void {
    this.loading = true;
    this.posService.getPagosCredito(this.venta.id).subscribe({
      next: p => {
        this.pagos = p;
        this.loading = false;
        // Set monto to actual remaining balance after pagos are known
        const saldo = parseFloat(this.saldoPendiente);
        this.montoNuevo = saldo > 0 ? saldo : null;
      },
      error: () => { this.loading = false; },
    });
  }

  get total(): number { return parseFloat(this.venta.total); }
  get montoPagado(): number { return this.pagos.reduce((s, p) => s + parseFloat(p.monto), 0); }
  get saldoPendiente(): string { return Math.max(0, this.total - this.montoPagado).toFixed(2); }
  get porcentajePagado(): number { return this.total > 0 ? Math.min(100, (this.montoPagado / this.total) * 100) : 0; }

  registrarPago(): void {
    if (!this.montoNuevo || this.montoNuevo <= 0) return;
    this.saving = true;
    this.posService.registrarPagoCredito(this.venta.id, {
      monto: this.montoNuevo,
      metodo_pago_id: this.metodoSeleccionado,
      notas: this.notasNuevo,
    }).subscribe({
      next: res => {
        this.saving = false;
        this.venta = res.venta;
        this.snack.open(`Pago de ${this.moneda} ${this.montoNuevo} registrado.`, 'OK', { duration: 3000 });
        this.pagos = [...this.pagos, res.pago];
        this.notasNuevo = '';
        this.montoNuevo = parseFloat(this.saldoPendiente) || null;
        if (res.venta.status === 'completada') {
          this.snack.open('¡Crédito completamente cobrado!', 'OK', { duration: 4000 });
          this.ref.close({ ventaActualizada: res.venta });
        }
      },
      error: err => {
        this.saving = false;
        this.snack.open(err.error?.error || 'Error al registrar pago.', 'OK', { duration: 4000, panelClass: 'snack-error' });
      },
    });
  }

  close(): void { this.ref.close({ ventaActualizada: this.venta }); }
}
