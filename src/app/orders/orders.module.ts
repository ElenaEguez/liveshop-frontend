import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule }       from '@angular/material/button';
import { MatDialogModule }       from '@angular/material/dialog';
import { MatFormFieldModule }    from '@angular/material/form-field';
import { MatIconModule }         from '@angular/material/icon';
import { MatInputModule }        from '@angular/material/input';
import { MatPaginatorModule }    from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule }        from '@angular/material/table';
import { MatTabsModule }         from '@angular/material/tabs';
import { MatTooltipModule }      from '@angular/material/tooltip';

import { OrdersRoutingModule }   from './orders-routing.module';
import { OrderListComponent }    from './order-list/order-list.component';
import { OrderDetailComponent }  from './order-detail/order-detail.component';

@NgModule({
  declarations: [
    OrderListComponent,
    OrderDetailComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    OrdersRoutingModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule
  ]
})
export class OrdersModule { }
