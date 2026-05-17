import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ComprasService, Proveedor } from '../../compras.service';
import { ProveedorDialogComponent } from '../proveedor-dialog/proveedor-dialog.component';

@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.scss']
})
export class ProveedoresComponent implements OnInit {
  proveedores: Proveedor[] = [];
  searchControl = new FormControl('');
  pageIndex = 0;
  pageSize = 10;
  totalCount = 0;
  loading = false;

  constructor(
    private comprasService: ComprasService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pageIndex = 0;
      this.cargar();
    });
  }

  cargar(): void {
    this.loading = true;
    const search = this.searchControl.value?.trim() || undefined;
    this.comprasService.getProveedoresPaginated(
      this.pageIndex + 1,
      this.pageSize,
      search
    ).subscribe({
      next: res => {
        this.proveedores = res.results;
        this.totalCount = res.count;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error al cargar proveedores', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.cargar();
  }

  onNuevo(): void {
    this.abrirDialog();
  }

  onEditar(p: Proveedor): void {
    this.abrirDialog(p);
  }

  private abrirDialog(proveedor?: Proveedor): void {
    const ref = this.dialog.open(ProveedorDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'dialog-md',
      data: { proveedor },
      disableClose: true,
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.cargar();
    });
  }

  onToggleActivo(p: Proveedor): void {
    this.comprasService.actualizarProveedor(
      p.id!, { activo: !p.activo }
    ).subscribe({
      next: () => this.cargar(),
      error: () => this.snack.open('Error al actualizar estado', 'Cerrar', { duration: 3000 }),
    });
  }

  onEliminar(p: Proveedor): void {
    if (!confirm(`¿Eliminar el proveedor "${p.nombre}"?`)) return;
    this.comprasService.eliminarProveedor(p.id!).subscribe({
      next: () => {
        this.snack.open('Proveedor eliminado.', 'Cerrar', { duration: 3000 });
        this.cargar();
      },
      error: (err) => {
        const msg = err.error?.detail
          || err.error?.error
          || 'No se puede eliminar el proveedor.';
        this.snack.open(msg, 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
      },
    });
  }
}
