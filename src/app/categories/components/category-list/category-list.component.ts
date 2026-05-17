import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Category, CategoryService } from '../../services/category.service';
import { CategoryFormDialogComponent } from '../category-form-dialog/category-form-dialog.component';

@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.css']
})
export class CategoryListComponent implements OnInit {
  categories: Category[] = [];
  displayedColumns = ['name', 'description', 'actions'];
  searchControl = new FormControl('');
  pageIndex = 0;
  pageSize = 50;
  totalCount = 0;
  loading = false;

  constructor(
    private categoryService: CategoryService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pageIndex = 0;
      this.loadCategories();
    });
  }

  loadCategories(): void {
    this.loading = true;
    const search = this.searchControl.value?.trim() || undefined;
    this.categoryService.getCategories(this.pageIndex + 1, this.pageSize, search).subscribe({
      next: (data) => {
        this.categories = data.results;
        this.totalCount = data.count;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al cargar categorías', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadCategories();
  }

  openForm(category?: Category): void {
    const dialogRef = this.dialog.open(CategoryFormDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'dialog-md',
      data: { category }
    });
    dialogRef.afterClosed().subscribe((saved: boolean) => {
      if (saved) this.loadCategories();
    });
  }

  delete(category: Category): void {
    if (!confirm(`¿Eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`)) return;
    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        this.snackBar.open('Categoría eliminada', 'Cerrar', { duration: 3000 });
        this.loadCategories();
      },
      error: (err) => {
        const msg = err.error?.detail
          || err.error?.error
          || (typeof err.error === 'string' ? err.error : null)
          || 'No se puede eliminar la categoría.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
      }
    });
  }
}
