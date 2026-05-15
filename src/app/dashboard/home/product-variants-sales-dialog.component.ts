import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { VarianteVenta } from '../dashboard.service';

export interface ProductVariantsSalesDialogData {
  productName: string;
  periodLabel: string;
  variantes: VarianteVenta[];
}

@Component({
  selector: 'app-product-variants-sales-dialog',
  templateUrl: './product-variants-sales-dialog.component.html',
  styleUrls: ['./product-variants-sales-dialog.component.css'],
})
export class ProductVariantsSalesDialogComponent {
  displayedColumns = ['variante', 'units_sold', 'revenue'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProductVariantsSalesDialogData,
    private dialogRef: MatDialogRef<ProductVariantsSalesDialogComponent>,
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
