import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule }          from '@angular/material/button';
import { MatCardModule }            from '@angular/material/card';
import { MatDialogModule }          from '@angular/material/dialog';
import { MatDividerModule }         from '@angular/material/divider';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatIconModule }            from '@angular/material/icon';
import { MatInputModule }           from '@angular/material/input';
import { MatPaginatorModule }       from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule }          from '@angular/material/select';
import { MatSlideToggleModule }     from '@angular/material/slide-toggle';
import { MatSnackBarModule }        from '@angular/material/snack-bar';
import { MatTableModule }           from '@angular/material/table';
import { MatTabsModule }            from '@angular/material/tabs';
import { MatTooltipModule }         from '@angular/material/tooltip';

import { PosRoutingModule }                    from './pos-routing.module';
import { PosComponent }                        from './pos/pos.component';
import { VentasListComponent }                 from './ventas-list/ventas-list.component';
import { AbrirCajaDialogComponent }            from './abrir-caja-dialog/abrir-caja-dialog.component';
import { CerrarCajaDialogComponent }           from './cerrar-caja-dialog/cerrar-caja-dialog.component';
import { MovimientoCajaDialogComponent }       from './movimiento-caja-dialog/movimiento-caja-dialog.component';
import { TicketPreviewDialogComponent }        from './ticket-preview/ticket-preview-dialog.component';
import { CobrarCreditoDialogComponent }        from './cobrar-credito-dialog/cobrar-credito-dialog.component';
import { ArqueosListComponent }                from './arqueos-list/arqueos-list.component';
import { ScannerConfigDialogComponent }        from './scanner-config-dialog/scanner-config-dialog.component';

@NgModule({
  declarations: [
    PosComponent,
    VentasListComponent,
    AbrirCajaDialogComponent,
    CerrarCajaDialogComponent,
    MovimientoCajaDialogComponent,
    TicketPreviewDialogComponent,
    CobrarCreditoDialogComponent,
    ArqueosListComponent,
    ScannerConfigDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PosRoutingModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
  ],
})
export class PosModule {}
