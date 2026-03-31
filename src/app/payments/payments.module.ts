import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { PaymentsRoutingModule } from './payments-routing.module';
import { PaymentListComponent } from './payment-list/payment-list.component';
import { PaymentVerifyComponent } from './payment-verify/payment-verify.component';
import { PaymentSettingsComponent } from './payment-settings/payment-settings.component';
import { PaymentReceiptDialogComponent } from './payment-receipt-dialog/payment-receipt-dialog.component';

@NgModule({
  declarations: [
    PaymentListComponent,
    PaymentVerifyComponent,
    PaymentSettingsComponent,
    PaymentReceiptDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaymentsRoutingModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ]
})
export class PaymentsModule { }
