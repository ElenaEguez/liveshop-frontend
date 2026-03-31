import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { WarehouseService } from '../warehouse.service';

@Component({
  selector: 'app-kardex-ajuste-dialog',
  templateUrl: './kardex-ajuste-dialog.component.html',
})
export class KardexAjusteDialogComponent implements OnInit {
  form!: FormGroup;
  inventories: any[] = [];
  almacenes: any[] = [];
  filteredInventories: any[] = [];
  loading = false;
  error = '';

  motivoChoices = [
    { value: 'ajuste_manual',  label: 'Ajuste manual' },
    { value: 'compra',         label: 'Compra / Reposición' },
    { value: 'devolucion',     label: 'Devolución' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<KardexAjusteDialogComponent>,
    private svc: WarehouseService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      inventorySearch: [''],
      inventory_id:    [null, Validators.required],
      cantidad:        [0, [Validators.required, Validators.min(-9999), Validators.max(9999)]],
      motivo:          ['ajuste_manual', Validators.required],
      notas:           [''],
    });

    this.svc.getInventories().subscribe(inv => {
      this.inventories = inv;
      this.filteredInventories = inv;
    });

    this.form.get('inventorySearch')!.valueChanges.subscribe((q: string) => {
      const term = (q || '').toLowerCase();
      this.filteredInventories = this.inventories.filter(i =>
        i.product_name.toLowerCase().includes(term)
      );
    });
  }

  selectInventory(inv: any): void {
    this.form.patchValue({ inventory_id: inv.id, inventorySearch: inv.product_name });
    this.filteredInventories = [];
  }

  get selectedInventory(): any {
    const id = this.form.get('inventory_id')?.value;
    return this.inventories.find(i => i.id === id);
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { inventory_id, cantidad, motivo, notas } = this.form.value;
    this.svc.ajustar({ inventory_id, cantidad: parseInt(String(cantidad), 10), motivo, notas }).subscribe({
      next: mov => this.dialogRef.close(mov),
      error: err => {
        this.error = err.error?.error || 'Error al registrar ajuste.';
        this.loading = false;
      },
    });
  }
}
