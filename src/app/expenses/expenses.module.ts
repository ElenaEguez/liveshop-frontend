import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule }          from '@angular/material/button';
import { MatCardModule }            from '@angular/material/card';
import { MatDialogModule }          from '@angular/material/dialog';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatIconModule }            from '@angular/material/icon';
import { MatInputModule }           from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule }          from '@angular/material/select';
import { MatSnackBarModule }        from '@angular/material/snack-bar';
import { MatTableModule }           from '@angular/material/table';
import { MatTooltipModule }         from '@angular/material/tooltip';

import { ExpensesRoutingModule }             from './expenses-routing.module';
import { GastosComponent }                   from './gastos/gastos.component';
import { GastoDialogComponent }              from './gasto-dialog/gasto-dialog.component';
import { HistorialGastosDialogComponent }    from './historial-gastos-dialog/historial-gastos-dialog.component';

@NgModule({
  declarations: [GastosComponent, GastoDialogComponent, HistorialGastosDialogComponent],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    ExpensesRoutingModule,
    MatButtonModule, MatCardModule, MatDialogModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule,
    MatSnackBarModule, MatTableModule, MatTooltipModule,
  ],
})
export class ExpensesModule {}
