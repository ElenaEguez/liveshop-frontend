import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TeamService, CustomRole } from '../services/team.service';

export interface RoleDialogData {
  role?: CustomRole;
}

@Component({
  selector: 'app-role-dialog',
  templateUrl: './role-dialog.component.html',
  styleUrls: ['./role-dialog.component.scss'],
})
export class RoleDialogComponent {
  form: FormGroup;
  saving = false;
  isEdit: boolean;

  modules = [
    { key: 'perm_products',     label: 'Productos',  description: 'Crear, editar y eliminar productos' },
    { key: 'perm_categories',   label: 'Categorías', description: 'Gestionar categorías del catálogo' },
    { key: 'perm_inventory',    label: 'Inventario', description: 'Ver y ajustar stock de productos' },
    { key: 'perm_live_sessions',label: 'Lives',      description: 'Crear y gestionar sesiones en vivo' },
    { key: 'perm_my_store',     label: 'Mi Tienda',  description: 'Editar perfil e información de la tienda' },
    { key: 'perm_orders',       label: 'Pedidos',          description: 'Ver y gestionar pedidos' },
    { key: 'perm_payments',     label: 'Pagos',            description: 'Confirmar y rechazar pagos' },
    { key: 'perm_pos',          label: 'Punto de Venta',   description: 'Acceder al módulo de venta física (POS)' },
    { key: 'perm_warehouse',    label: 'Almacén/Kardex',   description: 'Ver movimientos y ajustar inventario en almacén' },
    { key: 'perm_expenses',     label: 'Gastos',           description: 'Registrar y ver gastos operativos' },
    { key: 'perm_dashboard',    label: 'Dashboard',        description: 'Ver reportes y estadísticas' },
    { key: 'perm_team',         label: 'Equipo',           description: 'Gestionar miembros y roles del equipo' },
  ];

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private dialogRef: MatDialogRef<RoleDialogComponent>,
    private snackBar: MatSnackBar,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: RoleDialogData
  ) {
    const r = data?.role;
    this.isEdit = !!r;
    this.form = this.fb.group({
      name:               [r?.name               ?? '',    Validators.required],
      perm_products:      [r?.perm_products      ?? false],
      perm_categories:    [r?.perm_categories    ?? false],
      perm_inventory:     [r?.perm_inventory     ?? false],
      perm_live_sessions: [r?.perm_live_sessions ?? false],
      perm_my_store:      [r?.perm_my_store      ?? false],
      perm_orders:        [r?.perm_orders        ?? true ],
      perm_payments:      [r?.perm_payments      ?? false],
      perm_pos:           [r?.perm_pos           ?? false],
      perm_warehouse:     [r?.perm_warehouse     ?? false],
      perm_expenses:      [r?.perm_expenses      ?? false],
      perm_dashboard:     [r?.perm_dashboard     ?? false],
      perm_team:          [r?.perm_team          ?? false],
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;

    const payload = this.form.value;
    const request = this.isEdit
      ? this.teamService.updateRole(this.data.role!.id, payload)
      : this.teamService.createRole(payload);

    request.subscribe({
      next: (role) => this.dialogRef.close(role),
      error: (err) => {
        this.saving = false;
        const msg = err.error?.name?.[0]
          || err.error?.non_field_errors?.[0]
          || err.error?.detail
          || 'Error al guardar el rol.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
