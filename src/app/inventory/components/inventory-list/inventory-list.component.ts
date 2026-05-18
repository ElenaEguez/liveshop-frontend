import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  Inventory,
  InventoryService,
  InventoryVariantStock,
} from '../../services/inventory.service';
import { Category, ProductService } from '../../../products/products.service';
import {
  KardexDialogComponent,
  KardexDialogData,
} from '../kardex-dialog/kardex-dialog.component';

interface AlmacenOption {
  id: number;
  nombre: string;
  sucursal: number;
  activo?: boolean;
}

@Component({
  selector: 'app-inventory-list',
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.css']
})
export class InventoryListComponent implements OnInit {
  inventory: Inventory[] = [];
  categories: Category[] = [];
  sucursales: any[] = [];
  allAlmacenes: AlmacenOption[] = [];
  totalCount = 0;
  pageSize = 20;
  currentPage = 0;

  searchControl = new FormControl('');

  selectedCategoryId: number | null = null;
  selectedSucursalId: number | null = null;
  selectedAlmacenId: number | null = null;

  displayedColumns = ['product_name', 'available_quantity', 'acciones'];

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
    this.loadAlmacenes();

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 0;
      this.loadInventory();
    });
  }

  get almacenesForSelect(): AlmacenOption[] {
    const activos = this.allAlmacenes.filter(a => a.activo !== false);
    if (!this.selectedSucursalId) {
      return activos;
    }
    return activos.filter(a => a.sucursal === this.selectedSucursalId);
  }

  get selectedAlmacenNombre(): string {
    if (!this.selectedAlmacenId) return '';
    const a = this.allAlmacenes.find(x => x.id === this.selectedAlmacenId);
    return a ? this.almacenLabel(a) : '';
  }

  almacenLabel(a: AlmacenOption): string {
    const suc = this.sucursales.find(s => s.id === a.sucursal);
    return suc ? `${a.nombre} (${suc.nombre})` : a.nombre;
  }

  loadInventory(): void {
    const filters: any = {};
    if (this.selectedAlmacenId)  filters.almacen_id = this.selectedAlmacenId;
    if (this.selectedSucursalId) filters.sucursal_id = this.selectedSucursalId;
    if (this.selectedCategoryId) filters.category   = this.selectedCategoryId;
    if (this.searchControl.value) filters.search    = this.searchControl.value;
    filters.page = this.currentPage + 1;
    filters.page_size = this.pageSize;

    this.inventoryService.getInventory(filters).subscribe({
      next: (data: any) => {
        const list: Inventory[] = Array.isArray(data) ? data : (data.results ?? []);
        this.totalCount = Array.isArray(data) ? list.length : (data.count ?? list.length);
        this.inventory = list.map(item => ({
          ...item,
          available_quantity: item.available_quantity ?? Math.max(0, item.quantity - item.reserved_quantity),
          variantes: item.variantes ?? [],
          sin_asignar_variante: item.sin_asignar_variante ?? 0,
        }));
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

  loadAlmacenes(): void {
    this.inventoryService.getAlmacenes().subscribe({
      next: list => {
        this.allAlmacenes = (list || []).filter((a: AlmacenOption) => a.activo !== false);
      },
      error: () => {}
    });
  }

  onSucursalChange(): void {
    this.selectedAlmacenId = null;
    this.currentPage = 0;
    this.loadInventory();
  }

  onAlmacenChange(): void {
    this.currentPage = 0;
    this.loadInventory();
  }

  onCategoryChange(): void {
    this.currentPage = 0;
    this.loadInventory();
  }

  clearFilters(): void {
    this.selectedCategoryId = null;
    this.selectedSucursalId = null;
    this.selectedAlmacenId  = null;
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
              this.searchControl.value);
  }

  variantLabel(v: InventoryVariantStock): string {
    const parts = [v.talla, v.color].filter(Boolean);
    return parts.length ? parts.join(' / ') : '—';
  }

  openDetalle(item: Inventory): void {
    const data: KardexDialogData = {
      productId: item.product,
      productName: item.product_name,
      variantes: item.variantes,
      disponibleTotal: item.available_quantity,
      sinAsignarVariante: item.sin_asignar_variante,
    };
    this.dialog.open(KardexDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '85vh',
      data,
    });
  }

  onImprimir(): void {
    const almacenTxt = this.selectedAlmacenId
      ? `Almacén: ${this.selectedAlmacenNombre}`
      : 'Todos los almacenes';
    const filas = (this.inventory || []).map((item: Inventory) => {
      const vars = (item.variantes || [])
        .map(v => `${this.variantLabel(v)}: ${v.disponible}`)
        .join('; ');
      const extra = item.sin_asignar_variante
        ? `; sin variante: ${item.sin_asignar_variante}`
        : '';
      return `
      <tr>
        <td>${item.product_name || ''}</td>
        <td style="text-align:center">${item.available_quantity ?? 0}</td>
        <td>${vars}${extra}</td>
      </tr>`;
    }).join('');

    const ventana = window.open('', '_blank', 'width=640,height=520');
    if (!ventana) return;
    ventana.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reporte de Inventario</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; border-bottom: 1px solid #eee; }
        th { background: #f5f5f5; }
      </style>
    </head>
    <body>
      <h2>Reporte de Inventario</h2>
      <p>${almacenTxt}<br>${new Date().toLocaleString('es-BO')}</p>
      <table>
        <thead><tr><th>Producto</th><th>Disponible</th><th>Variantes</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <br><button onclick="window.print()">Imprimir</button>
    </body>
    </html>
  `);
    ventana.document.close();
  }

  get totalStockValue(): number {
    return this.inventory.reduce(
      (sum, i) => sum + (i.available_quantity ?? 0) * i.product_price,
      0
    );
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
