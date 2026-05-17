import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomRole, TeamMember, TeamService } from '../services/team.service';

export interface TeamMemberEditDialogData {
  member: TeamMember;
  roles: CustomRole[];
}

@Component({
  selector: 'app-team-member-edit-dialog',
  templateUrl: './team-member-edit-dialog.component.html',
  styleUrls: ['./team-member-edit-dialog.component.scss'],
})
export class TeamMemberEditDialogComponent implements OnInit {
  form!: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<TeamMemberEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TeamMemberEditDialogData,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      custom_role: [this.data.member.custom_role, Validators.required],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    this.teamService.updateMember(this.data.member.id, {
      custom_role: this.form.value.custom_role,
    }).subscribe({
      next: (updated) => {
        this.saving = false;
        this.dialogRef.close(updated);
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Error al actualizar el miembro.', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
