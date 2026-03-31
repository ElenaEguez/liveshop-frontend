import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Inventory, InventoryService } from '../../services/inventory.service';
import { Category, ProductVariant, ProductService } from '../../../products/products.service';
import { EditStockDialogComponent } from '../edit-stock-dialog/edit-stock-dialog.component';
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

  selectedCategoryId: number | null = null;
  selectedSucursalId: number | null = null;
  selectedAlmacenId: number | null = null;

  displayedColumns = ['product_name', 'quantity', 'reserved_quantity', 'available_quantity', 'purchase_cost', 'margin', 'variantes', 'actions'];

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
  }

  loadInventory(): void {
    const filters: any = {};
    if (this.selectedAlmacenId) filters.almacen_id = this.selectedAlmacenId;
    if (this.selectedCategoryId) filters.category = this.selectedCategoryId;

    this.inventoryService.getInventory(filters).subscribe({
      next: (data: any) => {
        const list: Inventory[] = Array.isArray(data) ? data : (data.results ?? []);
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
    this.loadInventory();
  }

  clearFilters(): void {
    this.selectedCategoryId = null;
    this.selectedSucursalId = null;
    this.selectedAlmacenId = null;
    this.almacenes = [];
    this.loadInventory();
  }

  get hasActiveFilters(): boolean {
    return !!(this.selectedCategoryId || this.selectedSucursalId || this.selectedAlmacenId);
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
      data: { productId: item.product, productName: item.product_name },
    });
  }

  openEditStock(item: Inventory): void {
    const dialogRef = this.dialog.open(EditStockDialogComponent, {
      width: '400px',
      data: { inventory: item }
    });
    dialogRef.afterClosed().subscribe((updated: boolean) => {
      if (updated) this.loadInventory();
    });
  }

  getMargin(item: Inventory): number | null {
    if (item.purchase_cost === null || item.purchase_cost === undefined) return null;
    return item.product_price - item.purchase_cost;
  }

  get totalStockValue(): number {
    return this.inventory.reduce((sum, i) => sum + i.quantity * i.product_price, 0);
  }

  get totalCostValue(): number {
    return this.inventory
      .filter(i => i.purchase_cost !== null && i.purchase_cost !== undefined)
      .reduce((sum, i) => sum + i.quantity * i.purchase_cost!, 0);
  }

  get hasCostData(): boolean {
    return this.inventory.some(i => i.purchase_cost !== null && i.purchase_cost !== undefined);
  }

  get totalMargin(): number {
    return this.totalStockValue - this.totalCostValue;
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
