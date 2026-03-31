import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TeamService, TeamMember, CustomRole } from '../services/team.service';
import { TeamInviteDialogComponent } from '../team-invite-dialog/team-invite-dialog.component';
import { RoleDialogComponent } from '../role-dialog/role-dialog.component';

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
      disableClose: true,
      data: { roles: this.roles }
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadMembers();
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
      disableClose: true,
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
    if (role.perm_dashboard)    labels.push('Dashboard');
    if (role.perm_products)     labels.push('Productos');
    if (role.perm_categories)   labels.push('Categorías');
    if (role.perm_inventory)    labels.push('Inventario');
    if (role.perm_live_sessions)labels.push('Lives');
    if (role.perm_my_store)     labels.push('Mi Tienda');
    if (role.perm_orders)       labels.push('Pedidos');
    if (role.perm_payments)     labels.push('Pagos');
    if (role.perm_team)         labels.push('Equipo');
    return labels.length ? labels.join(', ') : 'Sin accesos';
  }
}
