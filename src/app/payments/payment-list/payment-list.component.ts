import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { Payment, PaymentService } from '../services/payment.service';
import { PaymentVerifyComponent } from '../payment-verify/payment-verify.component';
import { PaymentReceiptDialogComponent } from '../payment-receipt-dialog/payment-receipt-dialog.component';
import { VendorProfileService } from '../../my-store/services/vendor-profile.service';
import { VendorSocketService } from '../../core/vendor-socket.service';

@Component({
  selector: 'app-payment-list',
  templateUrl: './payment-list.component.html',
  styleUrls: ['./payment-list.component.css']
})
export class PaymentListComponent implements OnInit, OnDestroy {
  payments:    Payment[] = [];
  allPayments: Payment[] = [];
  activeFilter = '';
  loading    = false;
  loadError  = false;
  totalCount = 0;
  pageSize   = 20;
  currentPage = 0;

  displayedColumns = ['id', 'customer', 'product', 'amount', 'method', 'reference', 'status', 'date', 'actions'];

  statusOptions = [
    { value: '',          label: 'Todos'       },
    { value: 'submitted', label: 'Enviados'    },
    { value: 'confirmed', label: 'Confirmados' },
    { value: 'rejected',  label: 'Rechazados'  }
  ];

  private socketSub?: Subscription;

  constructor(
    private paymentService: PaymentService,
    private vendorProfileService: VendorProfileService,
    private vendorSocket: VendorSocketService,
    private dialog:   MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPayments(this.activeFilter);

    // Connect WS and auto-refresh on payment events
    this.vendorProfileService.getProfile().subscribe(profile => {
      this.vendorSocket.connect(profile.id);
      this.socketSub = this.vendorSocket.events.pipe(
        filter(e => ['payment_submitted', 'payment_confirmed', 'payment_rejected'].includes(e.type)),
        debounceTime(400)
      ).subscribe(() => this.loadPayments(this.activeFilter, this.currentPage));
    });
  }

  loadPayments(filter: string = this.activeFilter, page: number = this.currentPage): void {
    this.activeFilter = filter;
    this.currentPage  = page;
    this.loading   = true;
    this.loadError = false;

    this.paymentService.getPayments(filter as any, page + 1, this.pageSize).subscribe({
      next: (response) => {
        this.payments    = response.results;
        this.allPayments = response.results;
        this.totalCount  = response.count;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('[PaymentList] Error:', err);
        this.loadError = true;
        this.loading   = false;
      }
    });
  }

  filterByStatus(filter: string): void {
    this.loadPayments(filter, 0);
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageSize = event.pageSize;
    this.loadPayments(this.activeFilter, event.pageIndex);
  }

  /** Confirma el pago directamente desde la tabla (sin dialog). */
  confirmInline(payment: Payment, event: MouseEvent): void {
    event.stopPropagation();
    this.paymentService.confirmPayment(payment.id).subscribe({
      next: () => {
        this.snackBar.open('Pago confirmado', 'Cerrar', { duration: 3000 });
        this.loadPayments(this.activeFilter);
      },
      error: () => this.snackBar.open('Error al confirmar el pago', 'Cerrar', { duration: 3000 })
    });
  }

  /** Rechaza el pago directamente desde la tabla (sin dialog). */
  rejectInline(payment: Payment, event: MouseEvent): void {
    event.stopPropagation();
    this.paymentService.rejectPayment(payment.id).subscribe({
      next: () => {
        this.snackBar.open('Pago rechazado', 'Cerrar', { duration: 3000 });
        this.loadPayments(this.activeFilter);
      },
      error: () => this.snackBar.open('Error al rechazar el pago', 'Cerrar', { duration: 3000 })
    });
  }

  /** Abre el comprobante en pantalla completa (solo imagen). */
  viewReceipt(payment: Payment, event: MouseEvent): void {
    event.stopPropagation();
    const url = this.getReceiptUrl(payment.receipt_image);
    if (!url) return;
    this.dialog.open(PaymentReceiptDialogComponent, {
      data: { url },
      maxWidth: '92vw',
      maxHeight: '96vh'
    });
  }

  /** Abre el dialog completo de verificación (detalle + confirmar/rechazar). */
  openVerify(payment: Payment): void {
    const dialogRef = this.dialog.open(PaymentVerifyComponent, {
      width: '640px',
      data: { payment }
    });
    dialogRef.afterClosed().subscribe((updated: boolean) => {
      if (updated) this.loadPayments(this.activeFilter);
    });
  }

  getReceiptUrl(path: string | null): string | null {
    return this.paymentService.getReceiptUrl(path);
  }

  getMethodLabel(method: string): string {
    return this.paymentService.getMethodLabel(method);
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:   'Sin comprobante',
      submitted: 'Enviado',
      confirmed: 'Confirmado',
      rejected:  'Rechazado'
    };
    return map[status] ?? status;
  }

  getStatusBg(status: string): string {
    const map: Record<string, string> = {
      pending:   '#f3f4f6',
      submitted: '#fef9c3',
      confirmed: '#dcfce7',
      rejected:  '#fee2e2'
    };
    return map[status] ?? '#f3f4f6';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      pending:   '#6b7280',
      submitted: '#854d0e',
      confirmed: '#166534',
      rejected:  '#991b1b'
    };
    return map[status] ?? '#6b7280';
  }

  ngOnDestroy(): void {
    this.socketSub?.unsubscribe();
  }
}
