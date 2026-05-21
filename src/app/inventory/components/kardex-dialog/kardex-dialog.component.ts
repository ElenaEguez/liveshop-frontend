import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ProductService, ProductVariant } from '../../../products/products.service';

export interface KardexDialogData {
  productId: number;
  productName: string;
  variantes?: InventoryVariantStock[];
  /** Stock vendible (suma variantes). */
  disponibleTotal?: number;
  /** Físico en almacén (cantidad − reservado). */
  inventarioDisponible?: number;
  sinAsignarVariante?: number;
}

export interface InventoryVariantStock {
  id: number;
  talla: string;
  color: string;
  color_hex?: string;
  sku?: string;
  disponible: number;
}

@Component({
  selector: 'app-kardex-dialog',
  templateUrl: './kardex-dialog.component.html',
  styleUrls: ['./kardex-dialog.component.scss'],
})
export class KardexDialogComponent implements OnInit {
  variantesActuales: InventoryVariantStock[] = [];
  disponibleTotal = 0;
  sinAsignarVariante = 0;
  loadingVariantes = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: KardexDialogData,
    private dialogRef: MatDialogRef<KardexDialogComponent>,
    private products: ProductService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (this.data.variantes?.length) {
      this.variantesActuales = this.data.variantes;
      this.disponibleTotal = this.data.disponibleTotal ?? 0;
      this.sinAsignarVariante = this.data.sinAsignarVariante ?? 0;
      return;
    }

    this.loadingVariantes = true;
    this.products.getVariantes(this.data.productId).subscribe({
      next: (v: ProductVariant[]) => {
        this.variantesActuales = (v || []).map(x => ({
          id: x.id,
          talla: x.talla || '',
          color: x.color || '',
          color_hex: x.color_hex,
          sku: x.sku || undefined,
          disponible: x.stock_extra ?? 0,
        }));
        this.loadingVariantes = false;
      },
      error: () => {
        this.variantesActuales = [];
        this.loadingVariantes = false;
      },
    });
  }

  variantLabel(v: InventoryVariantStock): string {
    const parts = [v.talla, v.color].filter(Boolean);
    return parts.length ? parts.join(' / ') : '—';
  }

  irAlmacen(): void {
    this.dialogRef.close();
    this.router.navigate(['/almacen'], {
      queryParams: { product_id: this.data.productId, product_name: this.data.productName },
    });
  }
}
