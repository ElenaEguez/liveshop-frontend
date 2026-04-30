import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface EditarFondoData {
  fondoActual: string;
  moneda: string;
}

@Component({
  selector: 'app-editar-fondo-dialog',
  template: `
    <h2 mat-dialog-title style="margin:0 0 8px;">Editar fondo inicial</h2>
    <mat-dialog-content style="padding: 0 0 8px; overflow-x: hidden; overflow-y: auto; max-height: min(70vh, 520px);">
      <p style="font-size:13px; color:#6b7280; margin:0 0 12px;">
        Fondo actual: <strong>{{ data.moneda }} {{ data.fondoActual }}</strong>
      </p>
      <mat-form-field appearance="outline" style="width:100%; margin-bottom:10px;">
        <mat-label>Acción</mat-label>
        <mat-select [(ngModel)]="accion">
          <mat-option value="set">Reemplazar fondo</mat-option>
          <mat-option value="sum">Aumentar fondo</mat-option>
          <mat-option value="sub">Disminuir fondo</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" style="width:100%;">
        <mat-label>{{ accion === 'set' ? 'Nuevo fondo' : 'Monto del ajuste' }} ({{ data.moneda }})</mat-label>
        <input matInput type="number" [(ngModel)]="montoAjuste" min="0" step="0.01"
               (keyup.enter)="aceptar()">
      </mat-form-field>
      <p style="font-size:13px; margin:8px 0 0; color:#374151;">
        Fondo resultante: <strong>{{ data.moneda }} {{ fondoResultante | number:'1.2-2' }}</strong>
      </p>
      <p *ngIf="accion === 'sub' && fondoResultante < 0" style="font-size:12px; color:#b91c1c; margin:6px 0 0;">
        El fondo no puede quedar negativo.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding: 10px 0 0; gap: 8px; flex-wrap: wrap; background:#fff;">
      <button mat-stroked-button (click)="dialogRef.close(null)">Cancelar</button>
      <button mat-raised-button color="primary"
              [disabled]="montoAjuste === null || montoAjuste < 0 || fondoResultante < 0"
              (click)="aceptar()">Aceptar</button>
    </mat-dialog-actions>
  `,
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
