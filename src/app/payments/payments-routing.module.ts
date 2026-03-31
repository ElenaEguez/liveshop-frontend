import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentListComponent } from './payment-list/payment-list.component';
import { PaymentSettingsComponent } from './payment-settings/payment-settings.component';

const routes: Routes = [
  { path: '', component: PaymentListComponent },
  { path: 'settings', component: PaymentSettingsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaymentsRoutingModule { }
