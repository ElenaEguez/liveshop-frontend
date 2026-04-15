import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Product, Category, PaginatedResponse, ProductService } from '../products.service';
import { ProductFormComponent } from '../product-form/product-form.component';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];
  availableTallas: string[] = [];
  availableColors: string[] = [];

  currentPage = 1;
  totalItems = 0;
  pageSize = 10;

  searchControl    = new FormControl('');
  categoryControl  = new FormControl('');
  tallaControl     = new FormControl('');
  colorControl     = new FormControl('');

  displayedColumns: string[] = ['name', 'price', 'stock', 'category', 'status', 'actions'];

  constructor(
    private productService: ProductService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadVariantOptions();
    this.loadProducts();

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => { this.currentPage = 1; this.loadProducts(); });

    this.categoryControl.valueChanges.subscribe(() => { this.currentPage = 1; this.loadProducts(); });
    this.tallaControl.valueChanges.subscribe(() => { this.currentPage = 1; this.loadProducts(); });
    this.colorControl.valueChanges.subscribe(() => { this.currentPage = 1; this.loadProducts(); });
  }

  loadProducts(): void {
    const search   = this.searchControl.value   || undefined;
    const category = this.categoryControl.value  ? Number(this.categoryControl.value) : undefined;
    const talla    = this.tallaControl.value     || undefined;
    const color    = this.colorControl.value     || undefined;

    this.productService.getProducts(this.currentPage, search, category, talla, color).subscribe(
      (response: any) => {
        if (Array.isArray(response)) {
          this.products   = response;
          this.totalItems = response.length;
        } else {
          this.products   = response.results || [];
          this.totalItems = response.count   || 0;
        }
      },
      error => console.error('Error loading products:', error)
    );
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe(
      categories => this.categories = categories,
      error => console.error('Error loading categories:', error)
    );
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

  clearFilters(): void {
    this.searchControl.setValue('');
    this.categoryControl.setValue('');
    this.tallaControl.setValue('');
    this.colorControl.setValue('');
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchControl.value || this.categoryControl.value ||
              this.tallaControl.value  || this.colorControl.value);
  }

  openProductForm(product?: Product): void {
    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: '700px',
      data: { product },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProducts();
      }
    });
  }

  viewProduct(product: Product): void {
    this.dialog.open(ProductFormComponent, {
      width: '700px',
      data: { product, viewOnly: true },
      disableClose: false,
    });
  }

  deleteProduct(product: Product): void {
    if (confirm('¿Está seguro de eliminar este producto?')) {
      this.productService.deleteProduct(product.id!).subscribe(
        () => this.loadProducts(),
        error => console.error('Error deleting product:', error)
      );
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadProducts();
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Sin categoría';
  }
}