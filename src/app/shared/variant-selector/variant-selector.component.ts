import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ProductService, ProductVariant } from '../../products/products.service';

export interface VariantSelection {
  variant_id: number;
  talla: string;
  color: string;
  color_hex: string;
  stock: number;
}

@Component({
  selector: 'app-variant-selector',
  templateUrl: './variant-selector.component.html',
})
export class VariantSelectorComponent implements OnChanges {
  @Input() productId!: number;
  @Output() variantSelected = new EventEmitter<VariantSelection>();
  @Output() variantCleared  = new EventEmitter<void>();

  tallas: string[] = [];
  selectedTalla: string | null = null;
  colores: ProductVariant[] = [];
  selectedVariantId: number | null = null;

  loadingTallas = false;
  loadingColores = false;

  constructor(private productService: ProductService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && this.productId) {
      this.reset();
      this.loadTallas();
    }
  }

  private reset(): void {
    this.tallas = [];
    this.selectedTalla = null;
    this.colores = [];
    this.selectedVariantId = null;
  }

  loadTallas(): void {
    this.loadingTallas = true;
    this.productService.getVariantesTallas(this.productId).subscribe({
      next: res => {
        this.tallas = res.tallas;
        this.loadingTallas = false;
      },
      error: () => { this.loadingTallas = false; }
    });
  }

  selectTalla(talla: string): void {
    if (this.selectedTalla === talla) return;
    this.selectedTalla = talla;
    this.selectedVariantId = null;
    this.colores = [];
    this.loadingColores = true;
    this.productService.getVariantesColores(this.productId, talla).subscribe({
      next: res => {
        this.colores = res.colores as ProductVariant[];
        this.loadingColores = false;
      },
      error: () => { this.loadingColores = false; }
    });
  }

  selectColor(v: ProductVariant): void {
    if (v.stock_extra === 0) return;
    this.selectedVariantId = v.id;
    this.variantSelected.emit({
      variant_id: v.id,
      talla: this.selectedTalla!,
      color: v.color,
      color_hex: v.color_hex,
      stock: v.stock_extra,
    });
  }

  clear(): void {
    this.reset();
    this.loadTallas();
    this.variantCleared.emit();
  }
}
