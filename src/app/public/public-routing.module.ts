import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LiveOrderComponent } from './live-order/live-order.component';

const routes: Routes = [
  { path: 'live/:slug', component: LiveOrderComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicRoutingModule {}
