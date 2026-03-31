import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyStoreComponent } from './components/my-store/my-store.component';

const routes: Routes = [
  { path: '', component: MyStoreComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MyStoreRoutingModule { }
