import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EcomOrder, EcommerceOrdersService } from '../ecommerce-orders.service';

export interface OrderDetailData {
  order: EcomOrder;
}

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit {
  order: EcomOrder;
  loading = false;
  error = '';
  internalNote = '';

  readonly deliveryLabels: Record<string, string> = {
    pickup: 'Recoger en tienda',
    delivery: 'Envío a domicilio'
  };

  readonly statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    pending_confirmation: 'Comprobante enviado',
    confirmed: 'Confirmado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };

  readonly paymentLabels: Record<string, string> = {
    tigo_money: 'Tigo Money',
    banco_union: 'Banco Unión',
    efectivo: 'Efectivo'
  };

  constructor(
    public dialogRef: MatDialogRef<OrderDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OrderDetailData,
    private service: EcommerceOrdersService
  ) {
    this.order = data.order;
  }

  ngOnInit(): void {}

  confirm(): void {
    this.loading = true;
    this.error = '';
    this.service.confirmOrder(this.order.id).subscribe({
      next: (updated) => {
        this.order = updated;
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Error al confirmar el pedido.';
        this.loading = false;
      }
    });
  }

  markDelivered(): void {
    this.loading = true;
    this.error = '';
    this.service.markDelivered(this.order.id).subscribe({
      next: (updated) => {
        this.order = updated;
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Error al marcar como entregado.';
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.loading = true;
    this.error = '';
    this.service.cancelOrder(this.order.id).subscribe({
      next: (updated) => {
        this.order = updated;
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Error al cancelar el pedido.';
        this.loading = false;
      }
    });
  }

  openReceipt(): void {
    if (this.order.payment_receipt_url) {
      window.open(this.order.payment_receipt_url, '_blank');
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
