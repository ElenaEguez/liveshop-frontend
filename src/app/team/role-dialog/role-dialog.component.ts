import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TeamService, CustomRole } from '../services/team.service';

export interface RoleDialogData {
  role?: CustomRole;
}

interface PermModule {
  key: string;
  label: string;
  description: string;
}

interface PermSection {
  title: string;
  modules: PermModule[];
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

  sections: PermSection[] = [
    {
      title: 'Reportes',
      modules: [
        { key: 'perm_dashboard', label: 'Dashboard', description: 'Ver reportes y estadísticas' },
        { key: 'perm_expenses', label: 'Gastos', description: 'Registrar y ver gastos operativos' },
        { key: 'perm_ecommerce_orders', label: 'Pedidos Web', description: 'Gestionar pedidos del ecommerce' },
      ],
    },
    {
      title: 'POS',
      modules: [
        { key: 'perm_pos', label: 'Vender (POS)', description: 'Punto de venta físico' },
        { key: 'perm_arqueos', label: 'Arqueos de caja', description: 'Arqueos y cierre de caja' },
        { key: 'perm_ventas_pos', label: 'Ventas POS', description: 'Historial de ventas POS' },
        { key: 'perm_devoluciones', label: 'Devoluciones', description: 'Devoluciones de venta' },
      ],
    },
    {
      title: 'Almacén',
      modules: [
        { key: 'perm_inventory', label: 'Inventario', description: 'Ver y ajustar stock' },
        { key: 'perm_conteos', label: 'Conteo físico', description: 'Registrar conteos físicos' },
        { key: 'perm_conteos_control', label: 'Control conteos', description: 'Aprobar y controlar conteos' },
        { key: 'perm_transferencias', label: 'Transferencias', description: 'Transferencias entre almacenes' },
        { key: 'perm_almacen', label: 'Almacén / Kardex', description: 'Movimientos y kardex de almacén' },
      ],
    },
    {
      title: 'Compras',
      modules: [
        { key: 'perm_compras', label: 'Órdenes de compra', description: 'Crear y gestionar órdenes de compra' },
        { key: 'perm_proveedores', label: 'Proveedores', description: 'Catálogo de proveedores' },
      ],
    },
    {
      title: 'Catálogo',
      modules: [
        { key: 'perm_products', label: 'Productos', description: 'Crear, editar y eliminar productos' },
        { key: 'perm_categories', label: 'Categorías', description: 'Gestionar categorías del catálogo' },
        { key: 'perm_live_sessions', label: 'Lives', description: 'Sesiones en vivo' },
        { key: 'perm_my_store', label: 'Mi Tienda', description: 'Perfil e información de la tienda' },
      ],
    },
    {
      title: 'Pedidos y pagos',
      modules: [
        { key: 'perm_orders', label: 'Pedidos', description: 'Ver y gestionar pedidos' },
        { key: 'perm_payments', label: 'Pagos', description: 'Confirmar y rechazar pagos' },
      ],
    },
    {
      title: 'Administración',
      modules: [
        { key: 'perm_team', label: 'Equipo', description: 'Miembros y roles del equipo' },
        { key: 'perm_manage_roles', label: 'Administrar roles/equipo', description: 'Crear/editar roles y gestionar asignaciones' },
        { key: 'perm_configuracion', label: 'Configuración', description: 'Ajustes generales del negocio' },
      ],
    },
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
      name: [r?.name ?? '', Validators.required],
      perm_products: [r?.perm_products ?? false],
      perm_categories: [r?.perm_categories ?? false],
      perm_inventory: [r?.perm_inventory ?? false],
      perm_live_sessions: [r?.perm_live_sessions ?? false],
      perm_my_store: [r?.perm_my_store ?? false],
      perm_orders: [r?.perm_orders ?? true],
      perm_payments: [r?.perm_payments ?? false],
      perm_pos: [r?.perm_pos ?? false],
      perm_warehouse: [r?.perm_warehouse ?? false],
      perm_expenses: [r?.perm_expenses ?? false],
      perm_compras: [r?.perm_compras ?? false],
      perm_dashboard: [r?.perm_dashboard ?? false],
      perm_team: [r?.perm_team ?? false],
      perm_manage_roles: [r?.perm_manage_roles ?? false],
      perm_arqueos: [r?.perm_arqueos ?? false],
      perm_ventas_pos: [r?.perm_ventas_pos ?? false],
      perm_devoluciones: [r?.perm_devoluciones ?? false],
      perm_conteos: [r?.perm_conteos ?? false],
      perm_conteos_control: [r?.perm_conteos_control ?? false],
      perm_transferencias: [r?.perm_transferencias ?? false],
      perm_almacen: [r?.perm_almacen ?? false],
      perm_proveedores: [r?.perm_proveedores ?? false],
      perm_configuracion: [r?.perm_configuracion ?? false],
      perm_ecommerce_orders: [r?.perm_ecommerce_orders ?? false],
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
