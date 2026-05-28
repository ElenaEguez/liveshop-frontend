import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PosComponent } from './pos/pos.component';
import { VentasListComponent } from './ventas-list/ventas-list.component';
import { ArqueosListComponent } from './arqueos-list/arqueos-list.component';
import { ModuloGuard } from '../auth/modulo.guard';

const routes: Routes = [
  { path: 'pos',     component: PosComponent, canActivate: [ModuloGuard], data: { modulo: 'pos' } },
  { path: 'ventas',  component: VentasListComponent, canActivate: [ModuloGuard], data: { modulo: 'ventas_pos' } },
  { path: 'arqueos', component: ArqueosListComponent, canActivate: [ModuloGuard], data: { modulo: 'arqueos' } },
  { path: '',        redirectTo: 'pos', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PosRoutingModule {}
