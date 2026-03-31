import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensesService, CategoriaGasto } from '../expenses.service';

@Component({
  selector: 'app-gasto-dialog',
  templateUrl: './gasto-dialog.component.html',
})
export class GastoDialogComponent implements OnInit {
  form!: FormGroup;
  categorias: CategoriaGasto[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<GastoDialogComponent>,
    private svc: ExpensesService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fecha:      [new Date().toISOString().substring(0, 10), Validators.required],
      monto:      [null, [Validators.required, Validators.min(0.01)]],
      concepto:   ['', Validators.required],
      categoria:  [null],
      notas:      [''],
    });
    this.loadCategorias();
  }

  loadCategorias(): void {
    this.svc.getCategorias().subscribe(c => this.categorias = c);
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.svc.createGasto(this.form.value).subscribe({
      next: g => this.dialogRef.close(g),
      error: err => {
        this.snack.open(err.error?.detail || 'Error al registrar gasto.', 'OK', { duration: 3000 });
        this.loading = false;
      },
    });
  }
}
