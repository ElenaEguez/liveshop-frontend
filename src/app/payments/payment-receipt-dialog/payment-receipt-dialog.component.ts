import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-payment-receipt-dialog',
  template: `
    <div style="padding:8px; min-width:280px;">
      <div style="display:flex; justify-content:flex-end; margin-bottom:4px;">
        <button mat-icon-button (click)="dialogRef.close()" style="color:#6b7280;">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <img [src]="data.url"
           alt="Comprobante de pago"
           style="max-width:100%; max-height:80vh; display:block; margin:auto; border-radius:8px;">
    </div>
  `
})
export class PaymentReceiptDialogComponent {
  constructor(
    public  dialogRef: MatDialogRef<PaymentReceiptDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { url: string }
  ) {}
}
