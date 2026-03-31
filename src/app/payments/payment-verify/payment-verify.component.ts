import { Component, Inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Payment, PaymentService } from '../services/payment.service';

@Component({
  selector: 'app-payment-verify',
  templateUrl: './payment-verify.component.html',
  styleUrls: ['./payment-verify.component.css']
})
export class PaymentVerifyComponent implements OnInit {
  payment: Payment;
  receiptUrl: string | null = null;
  notesControl = new FormControl('');
  loading = false;
  imageExpanded = false;

  constructor(
    private dialogRef: MatDialogRef<PaymentVerifyComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { payment: Payment },
    private paymentService: PaymentService
  ) {
    this.payment = data.payment;
  }

  ngOnInit(): void {
    this.receiptUrl = this.paymentService.getReceiptUrl(this.payment.receipt_image);
    if (this.payment.vendor_notes) {
      this.notesControl.setValue(this.payment.vendor_notes);
    }
  }

  confirm(): void {
    this.loading = true;
    this.paymentService.confirmPayment(this.payment.id, this.notesControl.value || '').subscribe(
      () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      (error: any) => {
        console.error('Error confirming payment:', error);
        this.loading = false;
      }
    );
  }

  reject(): void {
    this.loading = true;
    this.paymentService.rejectPayment(this.payment.id, this.notesControl.value || '').subscribe(
      () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      (error: any) => {
        console.error('Error rejecting payment:', error);
        this.loading = false;
      }
    );
  }

  close(): void {
    this.dialogRef.close(false);
  }

  getMethodLabel(method: string): string {
    return this.paymentService.getMethodLabel(method);
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Sin comprobante',
      submitted: 'Pendiente verificación',
      confirmed: 'Confirmado',
      rejected: 'Rechazado'
    };
    return map[status] ?? status;
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      pending: '#6b7280',
      submitted: '#854d0e',
      confirmed: '#166534',
      rejected: '#991b1b'
    };
    return map[status] ?? '#6b7280';
  }

  getStatusBg(status: string): string {
    const map: Record<string, string> = {
      pending: '#f3f4f6',
      submitted: '#fef9c3',
      confirmed: '#dcfce7',
      rejected: '#fee2e2'
    };
    return map[status] ?? '#f3f4f6';
  }

  get isPending(): boolean {
    return this.payment.status === 'submitted';
  }
}
