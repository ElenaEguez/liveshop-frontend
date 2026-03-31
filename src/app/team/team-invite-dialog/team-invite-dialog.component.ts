import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TeamService, CustomRole } from '../services/team.service';

export interface InviteDialogData {
  roles: CustomRole[];
}

@Component({
  selector: 'app-team-invite-dialog',
  templateUrl: './team-invite-dialog.component.html'
})
export class TeamInviteDialogComponent {
  form: FormGroup;
  saving = false;
  roles: CustomRole[];

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private dialogRef: MatDialogRef<TeamInviteDialogComponent>,
    private snackBar: MatSnackBar,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: InviteDialogData
  ) {
    this.roles = data?.roles ?? [];
    this.form = this.fb.group({
      email:       ['', [Validators.required, Validators.email]],
      nombre:      [''],
      apellido:    [''],
      custom_role: [null, Validators.required],
      password:    ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;

    const value = this.form.value;
    const payload: any = {
      email:       value.email,
      custom_role: value.custom_role
    };
    if (value.nombre)   payload['nombre']   = value.nombre;
    if (value.apellido) payload['apellido'] = value.apellido;
    if (value.password) payload['password'] = value.password;

    this.teamService.invite(payload).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.saving = false;
        const msg = err.error?.non_field_errors?.[0]
          || err.error?.detail
          || err.error?.email?.[0]
          || 'Error al agregar miembro.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
