import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NuevaDevolucionComponent } from './nueva-devolucion/nueva-devolucion.component';
import { HistorialDevolucionesComponent } from './historial-devoluciones/historial-devoluciones.component';

const routes: Routes = [
  { path: '', component: HistorialDevolucionesComponent },
  { path: 'nueva', component: NuevaDevolucionComponent },
];

@NgModule({
  declarations: [
    NuevaDevolucionComponent,
    HistorialDevolucionesComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatChipsModule,
    MatCheckboxModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
})
export class DevolucionesModule {}
