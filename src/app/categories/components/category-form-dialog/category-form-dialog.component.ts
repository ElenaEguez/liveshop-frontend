import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Category, CategoryService } from '../../services/category.service';

@Component({
  selector: 'app-category-form-dialog',
  templateUrl: './category-form-dialog.component.html'
})
export class CategoryFormDialogComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  isEdit: boolean;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CategoryFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { category?: Category },
    private categoryService: CategoryService,
    private snackBar: MatSnackBar
  ) {
    this.isEdit = !!data.category;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      name:        [this.data.category?.name        ?? '', Validators.required],
      description: [this.data.category?.description ?? '']
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const op = this.isEdit
      ? this.categoryService.updateCategory(this.data.category!.id, this.form.value)
      : this.categoryService.createCategory(this.form.value);

    op.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEdit ? 'Categoría actualizada' : 'Categoría creada',
          'Cerrar', { duration: 3000 }
        );
        this.dialogRef.close(true);
      },
      error: () => {
        this.snackBar.open('Error al guardar', 'Cerrar', { duration: 3000 });
        this.saving = false;
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
