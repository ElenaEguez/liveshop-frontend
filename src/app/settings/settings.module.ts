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
import { MatSlideToggleModule }     from '@angular/material/slide-toggle';
import { MatSnackBarModule }        from '@angular/material/snack-bar';
import { MatTableModule }           from '@angular/material/table';
import { MatTabsModule }            from '@angular/material/tabs';
import { MatTooltipModule }         from '@angular/material/tooltip';

import { SettingsRoutingModule }        from './settings-routing.module';
import { SettingsComponent }            from './settings/settings.component';
import { MetodoPagoDialogComponent }    from './metodo-pago-dialog/metodo-pago-dialog.component';
import { CuponDialogComponent }         from './cupon-dialog/cupon-dialog.component';
import { SucursalDialogComponent }      from './sucursal-dialog/sucursal-dialog.component';

@NgModule({
  declarations: [SettingsComponent, MetodoPagoDialogComponent, CuponDialogComponent, SucursalDialogComponent],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    SettingsRoutingModule,
    MatButtonModule, MatCardModule, MatDialogModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule,
    MatSlideToggleModule, MatSnackBarModule, MatTableModule, MatTabsModule, MatTooltipModule,
  ],
})
export class SettingsModule {}
