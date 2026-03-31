import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule }          from '@angular/material/button';
import { MatCardModule }            from '@angular/material/card';
import { MatDialogModule }          from '@angular/material/dialog';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatIconModule }            from '@angular/material/icon';
import { MatInputModule }           from '@angular/material/input';
import { MatPaginatorModule }       from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule }          from '@angular/material/select';
import { MatSnackBarModule }        from '@angular/material/snack-bar';
import { MatTableModule }           from '@angular/material/table';
import { MatTooltipModule }         from '@angular/material/tooltip';

import { WarehouseRoutingModule }         from './warehouse-routing.module';
import { AlmacenComponent }               from './almacen/almacen.component';
import { KardexAjusteDialogComponent }    from './kardex-ajuste-dialog/kardex-ajuste-dialog.component';

@NgModule({
  declarations: [AlmacenComponent, KardexAjusteDialogComponent],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    WarehouseRoutingModule,
    MatButtonModule, MatCardModule, MatDialogModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatPaginatorModule, MatProgressSpinnerModule,
    MatSelectModule, MatSnackBarModule, MatTableModule, MatTooltipModule,
  ],
})
export class WarehouseModule {}
