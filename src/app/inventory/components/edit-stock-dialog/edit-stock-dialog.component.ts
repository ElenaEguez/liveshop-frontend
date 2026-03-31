import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Inventory, InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-edit-stock-dialog',
  templateUrl: './edit-stock-dialog.component.html'
})
export class EditStockDialogComponent implements OnInit {
  form!: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditStockDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { inventory: Inventory },
    private inventoryService: InventoryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      quantity: [
        this.data.inventory.quantity,
        [Validators.required, Validators.min(this.data.inventory.reserved_quantity)]
      ],
      purchase_cost: [
        this.data.inventory.purchase_cost,
        [Validators.min(0)]
      ]
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const { quantity, purchase_cost } = this.form.value;
    this.inventoryService.updateStock(this.data.inventory.id, quantity, purchase_cost).subscribe({
      next: () => {
        this.snackBar.open('Stock actualizado', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.snackBar.open('Error al actualizar el stock', 'Cerrar', { duration: 3000 });
        this.saving = false;
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
