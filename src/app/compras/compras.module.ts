import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { ComprasRoutingModule } from './compras-routing.module';
import { OrdenListComponent } from './orden-list/orden-list.component';
import { OrdenFormComponent } from './orden-form/orden-form.component';
import { OrdenDetailComponent } from './orden-detail/orden-detail.component';
import { ProveedoresComponent } from './components/proveedores/proveedores.component';
import { DevolucionProveedorComponent } from './devolucion-proveedor/devolucion-proveedor.component';

@NgModule({
  declarations: [
    OrdenListComponent,
    OrdenFormComponent,
    OrdenDetailComponent,
    ProveedoresComponent,
    DevolucionProveedorComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    ComprasRoutingModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    MatChipsModule,
  ],
})
export class ComprasModule {}
