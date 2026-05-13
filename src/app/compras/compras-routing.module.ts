import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrdenListComponent } from './orden-list/orden-list.component';
import { OrdenFormComponent } from './orden-form/orden-form.component';
import { OrdenDetailComponent } from './orden-detail/orden-detail.component';
import { ProveedoresComponent } from './components/proveedores/proveedores.component';
import { DevolucionProveedorComponent } from './devolucion-proveedor/devolucion-proveedor.component';

const routes: Routes = [
  { path: 'proveedores', component: ProveedoresComponent },
  { path: 'devolucion-proveedor', component: DevolucionProveedorComponent },
  { path: '', component: OrdenListComponent },
  { path: 'new', component: OrdenFormComponent },
  { path: ':id/edit', component: OrdenFormComponent },
  { path: ':id', component: OrdenDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ComprasRoutingModule {}
