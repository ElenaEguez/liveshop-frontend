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
import { MatAutocompleteModule }    from '@angular/material/autocomplete';
import { MatExpansionModule }       from '@angular/material/expansion';
import { MatChipsModule }           from '@angular/material/chips';

import { WarehouseRoutingModule }         from './warehouse-routing.module';
import { AlmacenComponent }               from './almacen/almacen.component';
import { KardexAjusteDialogComponent }    from './kardex-ajuste-dialog/kardex-ajuste-dialog.component';
import { TransferenciasListComponent }    from './transferencias/transferencias-list.component';
import { TransferenciaFormComponent }    from './transferencias/transferencia-form.component';
import { TransferenciaDetailComponent } from './transferencias/transferencia-detail.component';
import { ConteosListComponent }           from './conteos/conteos-list.component';
import { ConteoFormComponent }            from './conteos/conteo-form.component';
import { ConteoDetailComponent }          from './conteos/conteo-detail.component';

@NgModule({
  declarations: [
    AlmacenComponent,
    KardexAjusteDialogComponent,
    TransferenciasListComponent,
    TransferenciaFormComponent,
    TransferenciaDetailComponent,
    ConteosListComponent,
    ConteoFormComponent,
    ConteoDetailComponent,
  ],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    WarehouseRoutingModule,
    MatButtonModule, MatCardModule, MatDialogModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatPaginatorModule, MatProgressSpinnerModule,
    MatSelectModule, MatSnackBarModule, MatTableModule, MatTooltipModule, MatAutocompleteModule,
    MatExpansionModule,
    MatChipsModule,
  ],
})
export class WarehouseModule {}
