import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LiveSessionListComponent } from './live-session-list/live-session-list.component';
import { LiveSessionDetailComponent } from './live-session-detail/live-session-detail.component';

const routes: Routes = [
  { path: '', component: LiveSessionListComponent },
  { path: ':id', component: LiveSessionDetailComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LiveSessionsRoutingModule { }
