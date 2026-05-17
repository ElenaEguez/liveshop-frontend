import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { VentaPOS } from '../pos.service';

export interface VentaItemsDetailDialogData {
  venta: VentaPOS;
}

@Component({
  selector: 'app-venta-items-detail-dialog',
  templateUrl: './venta-items-detail-dialog.component.html',
  styleUrls: ['./venta-items-detail-dialog.component.scss'],
})
export class VentaItemsDetailDialogComponent {
  cols = ['producto', 'variante', 'cantidad', 'precio', 'subtotal'];

  constructor(
    public dialogRef: MatDialogRef<VentaItemsDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VentaItemsDetailDialogData,
  ) {}

  get venta(): VentaPOS {
    return this.data.venta;
  }
}
