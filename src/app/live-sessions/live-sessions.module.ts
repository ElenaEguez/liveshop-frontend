import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { LiveSessionsRoutingModule } from './live-sessions-routing.module';
import { LiveSessionListComponent } from './live-session-list/live-session-list.component';
import { LiveSessionFormComponent } from './live-session-form/live-session-form.component';
import { LiveSessionDetailComponent } from './live-session-detail/live-session-detail.component';

@NgModule({
  declarations: [
    LiveSessionListComponent,
    LiveSessionFormComponent,
    LiveSessionDetailComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LiveSessionsRoutingModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule
  ]
})
export class LiveSessionsModule { }
