import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface EditarFondoData {
  fondoActual: string;
  moneda: string;
}

@Component({
  selector: 'app-editar-fondo-dialog',
  template: `
    <h2 mat-dialog-title>Editar fondo inicial</h2>
    <mat-dialog-content>
      <p style="font-size:13px; color:#6b7280; margin:0 0 12px;">
        Fondo actual: <strong>{{ data.moneda }} {{ data.fondoActual }}</strong>
      </p>
      <mat-form-field appearance="outline" style="width:100%;">
        <mat-label>Nuevo monto ({{ data.moneda }})</mat-label>
        <input matInput type="number" [(ngModel)]="nuevoFondo" min="0" step="0.01"
               (keyup.enter)="aceptar()">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="dialogRef.close(null)">Cancelar</button>
      <button mat-raised-button color="primary"
              [disabled]="nuevoFondo === null || nuevoFondo < 0"
              (click)="aceptar()">Aceptar</button>
    </mat-dialog-actions>
  `,
})
export class EditarFondoDialogComponent {
  nuevoFondo: number | null = null;

  constructor(
    public dialogRef: MatDialogRef<EditarFondoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditarFondoData,
  ) {
    this.nuevoFondo = parseFloat(data.fondoActual) || 0;
  }

  aceptar(): void {
    if (this.nuevoFondo === null || this.nuevoFondo < 0) return;
    this.dialogRef.close(this.nuevoFondo);
  }
}
