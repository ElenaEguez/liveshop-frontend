import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PosComponent } from './pos/pos.component';
import { VentasListComponent } from './ventas-list/ventas-list.component';
import { ArqueosListComponent } from './arqueos-list/arqueos-list.component';

const routes: Routes = [
  { path: 'pos',     component: PosComponent },
  { path: 'ventas',  component: VentasListComponent },
  { path: 'arqueos', component: ArqueosListComponent },
  { path: '',        redirectTo: 'pos', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PosRoutingModule {}
