import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface EditarFondoData {
  fondoActual: string;
  moneda: string;
}

@Component({
  selector: 'app-editar-fondo-dialog',
  templateUrl: './editar-fondo-dialog.component.html',
  styleUrls: ['./editar-fondo-dialog.component.scss'],
})
export class EditarFondoDialogComponent {
  accion: 'set' | 'sum' | 'sub' = 'set';
  montoAjuste: number | null = null;
  fondoBase = 0;

  constructor(
    public dialogRef: MatDialogRef<EditarFondoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditarFondoData,
  ) {
    this.fondoBase = parseFloat(String(data.fondoActual).replace(/,/g, '')) || 0;
    this.montoAjuste = this.fondoBase;
  }

  get fondoResultante(): number {
    const v = Number(this.montoAjuste ?? 0);
    if (this.accion === 'sum') return this.fondoBase + v;
    if (this.accion === 'sub') return this.fondoBase - v;
    return v;
  }

  aceptar(): void {
    if (this.montoAjuste === null || this.montoAjuste < 0 || this.fondoResultante < 0) return;
    this.dialogRef.close(Number(this.fondoResultante.toFixed(2)));
  }
}
