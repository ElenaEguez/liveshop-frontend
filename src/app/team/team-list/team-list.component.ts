import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TeamService, TeamMember, CustomRole } from '../services/team.service';
import { TeamInviteDialogComponent } from '../team-invite-dialog/team-invite-dialog.component';
import { RoleDialogComponent } from '../role-dialog/role-dialog.component';
import { TeamMemberEditDialogComponent } from '../team-member-edit-dialog/team-member-edit-dialog.component';

@Component({
  selector: 'app-team-list',
  templateUrl: './team-list.component.html',
  styleUrls: ['./team-list.component.scss']
})
export class TeamListComponent implements OnInit {
  members: TeamMember[] = [];
  roles: CustomRole[]   = [];
  loadingMembers = true;
  loadingRoles   = true;

  memberColumns = ['name', 'email', 'role', 'status', 'actions'];
  roleColumns   = ['name', 'perms', 'actions'];

  readonly MAX_MEMBERS = 3;

  constructor(
    private teamService: TeamService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadMembers();
    this.loadRoles();
  }

  // ── Members ─────────────────────────────────────────────

  loadMembers(): void {
    this.loadingMembers = true;
    this.teamService.getTeam().subscribe({
      next: (data) => { this.members = data; this.loadingMembers = false; },
      error: () => { this.loadingMembers = false; }
    });
  }

  get activeCount(): number {
    return this.members.filter(m => m.is_active).length;
  }

  get canInvite(): boolean {
    return this.activeCount < this.MAX_MEMBERS;
  }

  openInvite(): void {
    const ref = this.dialog.open(TeamInviteDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true,
      autoFocus: false,
      panelClass: 'dialog-md',
      data: { roles: this.roles }
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadMembers();
    });
  }

  openEditMember(member: TeamMember): void {
    const ref = this.dialog.open(TeamMemberEditDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      autoFocus: false,
      panelClass: 'dialog-md',
      data: { member, roles: this.roles },
    });
    ref.afterClosed().subscribe(updated => {
      if (updated) {
        const idx = this.members.findIndex(m => m.id === updated.id);
        if (idx >= 0) {
          this.members[idx] = updated;
          this.members = [...this.members];
        }
      }
    });
  }

  toggleActive(member: TeamMember): void {
    this.teamService.updateMember(member.id, { is_active: !member.is_active }).subscribe({
      next: (updated) => { member.is_active = updated.is_active; },
      error: () => this.snackBar.open('Error al actualizar el estado.', 'Cerrar', { duration: 3000 })
    });
  }

  confirmDeleteMember(member: TeamMember): void {
    if (!confirm(`¿Eliminar a ${member.user_name || member.user_email} del equipo?`)) return;
    this.teamService.removeMember(member.id).subscribe({
      next: () => {
        this.members = this.members.filter(m => m.id !== member.id);
        this.snackBar.open('Miembro eliminado.', '', { duration: 2500 });
      },
      error: () => this.snackBar.open('Error al eliminar.', 'Cerrar', { duration: 3000 })
    });
  }

  // ── Roles ────────────────────────────────────────────────

  loadRoles(): void {
    this.loadingRoles = true;
    this.teamService.getRoles().subscribe({
      next: (data) => { this.roles = data; this.loadingRoles = false; },
      error: () => { this.loadingRoles = false; }
    });
  }

  openRoleDialog(role?: CustomRole): void {
    const ref = this.dialog.open(RoleDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true,
      autoFocus: false,
      panelClass: 'dialog-md',
      data: { role }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      if (role) {
        const idx = this.roles.findIndex(r => r.id === role.id);
        if (idx >= 0) this.roles[idx] = result;
      } else {
        this.roles = [...this.roles, result];
      }
    });
  }

  confirmDeleteRole(role: CustomRole): void {
    const inUse = this.members.some(m => m.custom_role === role.id);
    if (inUse && !confirm(`El rol "${role.name}" está en uso. ¿Eliminarlo de todas formas?`)) return;
    if (!inUse && !confirm(`¿Eliminar el rol "${role.name}"?`)) return;

    this.teamService.deleteRole(role.id).subscribe({
      next: () => {
        this.roles = this.roles.filter(r => r.id !== role.id);
        this.snackBar.open('Rol eliminado.', '', { duration: 2500 });
      },
      error: () => this.snackBar.open('Error al eliminar el rol.', 'Cerrar', { duration: 3000 })
    });
  }

  permSummary(role: CustomRole): string {
    const labels: string[] = [];
    if (role.perm_dashboard)       labels.push('Dashboard');
    if (role.perm_expenses)        labels.push('Gastos');
    if (role.perm_pos)             labels.push('POS');
    if (role.perm_arqueos)         labels.push('Arqueos');
    if (role.perm_ventas_pos)      labels.push('Ventas');
    if (role.perm_devoluciones)    labels.push('Devoluciones');
    if (role.perm_inventory)       labels.push('Inventario');
    if (role.perm_conteos)         labels.push('Conteos');
    if (role.perm_conteos_control) labels.push('Ctrl. conteos');
    if (role.perm_transferencias)  labels.push('Transferencias');
    if (role.perm_almacen)         labels.push('Almacén');
    if (role.perm_compras)         labels.push('Compras');
    if (role.perm_proveedores)     labels.push('Proveedores');
    if (role.perm_products)        labels.push('Productos');
    if (role.perm_categories)      labels.push('Categorías');
    if (role.perm_live_sessions)   labels.push('Lives');
    if (role.perm_my_store)        labels.push('Mi Tienda');
    if (role.perm_orders)          labels.push('Pedidos');
    if (role.perm_payments)        labels.push('Pagos');
    if (role.perm_team)            labels.push('Equipo');
    if (role.perm_configuracion)   labels.push('Config.');
    if (role.perm_ecommerce_orders)labels.push('Pedidos Web');
    return labels.length ? labels.join(', ') : 'Sin accesos';
  }
}
