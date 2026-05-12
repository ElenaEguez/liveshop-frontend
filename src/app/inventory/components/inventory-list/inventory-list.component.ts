import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Inventory, InventoryService } from '../../services/inventory.service';
import { Category, ProductVariant, ProductService } from '../../../products/products.service';
import { KardexDialogComponent } from '../kardex-dialog/kardex-dialog.component';

@Component({
  selector: 'app-inventory-list',
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.css']
})
export class InventoryListComponent implements OnInit {
  inventory: Inventory[] = [];
  categories: Category[] = [];
  sucursales: any[] = [];
  almacenes: any[] = [];
  availableTallas: string[] = [];
  availableColors: string[] = [];

  selectedCategoryId: number | null = null;
  selectedSucursalId: number | null = null;
  selectedAlmacenId: number | null = null;
  selectedTalla: string = '';
  selectedColor: string = '';
  totalCount = 0;
  pageSize = 20;
  currentPage = 0; // 0-indexed for paginator

  searchControl = new FormControl('');

  displayedColumns = ['product_name', 'talla', 'color', 'quantity', 'reserved_quantity', 'available_quantity', 'vendido', 'variantes'];

  // Variant expansion state
  expandedProductId: number | null = null;
  itemVariants: Record<number, ProductVariant[]> = {};
  loadingVariants: Record<number, boolean> = {};

  constructor(
    private inventoryService: InventoryService,
    private productService: ProductService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadInventory();
    this.loadCategories();
    this.loadSucursales();
    this.loadVariantOptions();

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 0;
      this.loadInventory();
    });
  }

  loadInventory(): void {
    const filters: any = {};
    if (this.selectedAlmacenId)  filters.almacen_id = this.selectedAlmacenId;
    if (this.selectedCategoryId) filters.category   = this.selectedCategoryId;
    if (this.searchControl.value) filters.search    = this.searchControl.value;
    if (this.selectedTalla)      filters.talla      = this.selectedTalla;
    if (this.selectedColor)      filters.color      = this.selectedColor;
    filters.page = this.currentPage + 1;
    filters.page_size = this.pageSize;

    this.inventoryService.getInventory(filters).subscribe({
      next: (data: any) => {
        const list: Inventory[] = Array.isArray(data) ? data : (data.results ?? []);
        this.totalCount = Array.isArray(data) ? list.length : (data.count ?? list.length);
        this.inventory = list.map(item => ({
          ...item,
          available_quantity: item.available_quantity ?? (item.quantity - item.reserved_quantity)
        }));
        this.expandedProductId = null;
      },
      error: () => this.snackBar.open('Error al cargar el inventario', 'Cerrar', { duration: 3000 })
    });
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: cats => this.categories = cats,
      error: () => {}
    });
  }

  loadVariantOptions(): void {
    this.productService.getAllVariantOptions().subscribe({
      next: opts => {
        this.availableTallas = opts.tallas;
        this.availableColors = opts.colors;
      },
      error: () => {}
    });
  }

  loadSucursales(): void {
    this.inventoryService.getSucursales().subscribe({
      next: list => this.sucursales = list,
      error: () => {}
    });
  }

  onSucursalChange(): void {
    this.selectedAlmacenId = null;
    this.almacenes = [];
    if (this.selectedSucursalId) {
      this.inventoryService.getAlmacenes(this.selectedSucursalId).subscribe({
        next: list => this.almacenes = list,
        error: () => {}
      });
    }
    this.loadInventory();
  }

  onAlmacenChange(): void {
    this.loadInventory();
  }

  onCategoryChange(): void {
    this.currentPage = 0;
    this.loadInventory();
  }

  onTallaChange(): void  { this.currentPage = 0; this.loadInventory(); }
  onColorChange(): void  { this.currentPage = 0; this.loadInventory(); }

  clearFilters(): void {
    this.selectedCategoryId = null;
    this.selectedSucursalId = null;
    this.selectedAlmacenId  = null;
    this.selectedTalla      = '';
    this.selectedColor      = '';
    this.almacenes = [];
    this.currentPage = 0;
    this.searchControl.setValue('');
    this.loadInventory();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadInventory();
  }

  get hasActiveFilters(): boolean {
    return !!(this.selectedCategoryId || this.selectedSucursalId || this.selectedAlmacenId ||
              this.selectedTalla || this.selectedColor || this.searchControl.value);
  }

  // ── Variant expansion ────────────────────────────────────────────────────────

  toggleVariants(item: Inventory): void {
    if (this.expandedProductId === item.product) {
      this.expandedProductId = null;
      return;
    }
    this.expandedProductId = item.product;
    if (!this.itemVariants[item.product]) {
      this.loadingVariants[item.product] = true;
      this.inventoryService.getVariantes(item.product).subscribe({
        next: variants => {
          this.itemVariants[item.product] = variants;
          this.loadingVariants[item.product] = false;
        },
        error: () => {
          this.itemVariants[item.product] = [];
          this.loadingVariants[item.product] = false;
        }
      });
    }
  }

  isExpanded(item: Inventory): boolean {
    return this.expandedProductId === item.product;
  }

  getVariants(item: Inventory): ProductVariant[] {
    return this.itemVariants[item.product] ?? [];
  }

  isLoadingVariants(item: Inventory): boolean {
    return !!this.loadingVariants[item.product];
  }

  // ── Inventory actions ────────────────────────────────────────────────────────

  openKardex(item: Inventory): void {
    this.dialog.open(KardexDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '92vh',
      data: { productId: item.product, productName: item.product_name },
    });
  }

  onImprimir(): void {
    const filas = (this.inventory || []).map((item: any) => {
      const v = item.variante;
      return `
      <tr>
        <td>${item.producto_nombre || item.product_name || item.product?.name || ''}</td>
        <td>${v?.talla || '—'}</td>
        <td>${v?.color || '—'}</td>
        <td style="text-align:center">
          ${item.quantity ?? item.stock_extra ?? 0}
        </td>
      </tr>`;
    }).join('');

    const ventana = window.open('', '_blank', 'width=600,height=500');
    if (!ventana) return;
    ventana.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reporte de Inventario</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { margin-bottom: 4px; }
        p  { color: #666; font-size: 13px; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; text-align: left;
             padding: 8px; border-bottom: 2px solid #ddd; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; }
        tr:last-child td { border-bottom: none; }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h2>Reporte de Inventario</h2>
      <p>Generado: ${new Date().toLocaleString('es-BO')}</p>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Talla</th>
            <th>Color</th>
            <th>Stock disponible</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <br>
      <button onclick="window.print()">Imprimir</button>
    </body>
    </html>
  `);
    ventana.document.close();
  }

  get totalStockValue(): number {
    return this.inventory.reduce((sum, i) => sum + i.quantity * i.product_price, 0);
  }

  getAvailableBg(qty: number): string {
    if (qty <= 0) return '#fee2e2';
    if (qty <= 5) return '#fef9c3';
    return '#dcfce7';
  }

  getAvailableColor(qty: number): string {
    if (qty <= 0) return '#991b1b';
    if (qty <= 5) return '#854d0e';
    return '#166534';
  }
}
