import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AlmacenComponent } from './almacen/almacen.component';
import { TransferenciasListComponent } from './transferencias/transferencias-list.component';
import { TransferenciaFormComponent } from './transferencias/transferencia-form.component';
import { TransferenciaDetailComponent } from './transferencias/transferencia-detail.component';
import { ConteosListComponent } from './conteos/conteos-list.component';
import { ConteoFormComponent } from './conteos/conteo-form.component';
import { ConteoDetailComponent } from './conteos/conteo-detail.component';
import { ConteosSupervisionComponent } from './conteos/conteos-supervision.component';
import { ModuloGuard } from '../auth/modulo.guard';

const routes: Routes = [
  {
    path: 'transferencias/nueva',
    component: TransferenciaFormComponent,
    canActivate: [ModuloGuard],
    data: { modulo: 'transferencias', accion: 'operar' },
  },
  {
    path: 'transferencias/:id/edit',
    component: TransferenciaFormComponent,
    canActivate: [ModuloGuard],
    data: { modulo: 'transferencias', accion: 'operar' },
  },
  {
    path: 'transferencias/:id',
    component: TransferenciaDetailComponent,
    canActivate: [ModuloGuard],
    data: { modulo: 'transferencias' },
  },
  {
    path: 'transferencias',
    component: TransferenciasListComponent,
    canActivate: [ModuloGuard],
    data: { modulo: 'transferencias' },
  },
  {
    path: 'conteos-control',
    component: ConteosSupervisionComponent,
    canActivate: [ModuloGuard],
    data: { modulo: 'conteos_control', accion: 'operar' },
  },
  {
    path: 'conteos/nuevo',
    component: ConteoFormComponent,
    canActivate: [ModuloGuard],
    data: { modulo: 'conteos', accion: 'operar' },
  },
  {
    path: 'conteos/:id',
    component: ConteoDetailComponent,
    canActivate: [ModuloGuard],
    data: { modulo: 'conteos' },
  },
  {
    path: 'conteos',
    component: ConteosListComponent,
    canActivate: [ModuloGuard],
    data: { modulo: 'conteos' },
  },
  {
    path: '',
    component: AlmacenComponent,
    canActivate: [ModuloGuard],
    data: { modulo: 'almacen' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WarehouseRoutingModule {}
