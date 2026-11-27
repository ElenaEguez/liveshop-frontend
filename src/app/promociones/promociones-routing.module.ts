import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PromocionListComponent } from './components/promocion-list/promocion-list.component';

const routes: Routes = [
  { path: '', component: PromocionListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PromocionesRoutingModule { }
