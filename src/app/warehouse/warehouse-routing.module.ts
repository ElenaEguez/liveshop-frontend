import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AlmacenComponent } from './almacen/almacen.component';
import { TransferenciasListComponent } from './transferencias/transferencias-list.component';
import { TransferenciaFormComponent } from './transferencias/transferencia-form.component';
import { TransferenciaDetailComponent } from './transferencias/transferencia-detail.component';
import { ConteosListComponent } from './conteos/conteos-list.component';
import { ConteoFormComponent } from './conteos/conteo-form.component';
import { ConteoDetailComponent } from './conteos/conteo-detail.component';

const routes: Routes = [
  { path: 'transferencias/nueva', component: TransferenciaFormComponent },
  { path: 'transferencias/:id', component: TransferenciaDetailComponent },
  { path: 'transferencias', component: TransferenciasListComponent },
  { path: 'conteos/nuevo', component: ConteoFormComponent },
  { path: 'conteos/:id', component: ConteoDetailComponent },
  { path: 'conteos', component: ConteosListComponent },
  { path: '', component: AlmacenComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WarehouseRoutingModule {}
