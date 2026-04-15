import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Order, OrderStatus, OrderService } from '../services/order.service';
import { PermissionsService } from '../../shared/permissions.service';

interface StatusAction {
  label: string;
  next: OrderStatus;
  color: 'primary' | 'accent' | 'warn' | '';
}

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.css']
})
export class OrderDetailComponent {
  order: Order;
  saving = false;

  // Status flow: pending → confirmed → paid → recibido → delivered
  // pending   = order placed, no payment proof yet
  // confirmed = client sent payment proof
  // paid      = vendor verified the payment
  // recibido  = client confirmed receipt
  // delivered = vendor marked as delivered
  private transitions: Partial<Record<OrderStatus, StatusAction[]>> = {
    pending: [
      { label: 'Confirmar pedido', next: 'confirmed', color: 'primary' },
      { label: 'Cancelar',         next: 'cancelled', color: 'warn'    }
    ],
    confirmed: [
      { label: 'Marcar entregado', next: 'delivered', color: 'primary' },
      { label: 'Cancelar',         next: 'cancelled', color: 'warn'    }
    ],
    paid: [
      { label: 'Marcar entregado', next: 'delivered', color: 'primary' },
      { label: 'Cancelar',         next: 'cancelled', color: 'warn'    }
    ],
    recibido: [
      { label: 'Marcar entregado', next: 'delivered', color: '' }
    ]
  };

  constructor(
    private orderService:       OrderService,
    private dialogRef:          MatDialogRef<OrderDetailComponent>,
    private permissionsService: PermissionsService,
    @Inject(MAT_DIALOG_DATA) public data: { order: Order }
  ) {
    this.order = { ...data.order };
  }

  get actions(): StatusAction[] {
    const all = this.transitions[this.order.status] ?? [];
    // Payment confirm/reject requires the payments permission
    if (this.order.status === 'paid' && !this.permissionsService.canConfirmPayments()) {
      return [];
    }
    return all;
  }

  changeStatus(next: OrderStatus): void {
    this.saving = true;
    this.orderService.updateStatus(this.order.id, next).subscribe({
      next: updated => {
        this.order  = updated;
        this.saving = false;
      },
      error: () => { this.saving = false; }
    });
  }

  close(): void {
    this.dialogRef.close(true);
  }

  // ── WhatsApp ──────────────────────────────────────────────────────
  openWhatsApp(): void {
    const phone = this.cleanPhone(this.order.customer_phone);
    const text  = encodeURIComponent(
      `Hola ${this.order.customer_name}, tu pedido está listo`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  }

  cleanPhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '591' + cleaned.slice(1);
    }
    return cleaned;
  }

  // ── Status helpers ────────────────────────────────────────────────
  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:   'Sin comprobante',
      confirmed: 'Comprobante enviado',
      paid:      'Pago verificado',
      recibido:  'Recibido por cliente',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    };
    return map[status] ?? status;
  }

  // Status pipeline for visual progress
  readonly statusPipeline = ['pending', 'confirmed', 'paid', 'delivered'];

  getStepIndex(status: string): number {
    if (status === 'recibido') return 3;
    return this.statusPipeline.indexOf(status);
  }

  getStepLabel(s: string): string {
    const m: Record<string, string> = {
      pending:   'Sin comprobante',
      confirmed: 'Comprobante enviado',
      paid:      'Pago verificado',
      delivered: 'Entregado'
    };
    return m[s] ?? s;
  }

  getStatusBg(status: string): string {
    const map: Record<string, string> = {
      pending:   '#fef9c3',
      confirmed: '#eff6ff',
      paid:      '#ccfbf1',
      recibido:  '#dcfce7',
      delivered: '#d1fae5',
      cancelled: '#fee2e2'
    };
    return map[status] ?? '#f3f4f6';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      pending:   '#854d0e',
      confirmed: '#1d4ed8',
      paid:      '#0f766e',
      recibido:  '#166534',
      delivered: '#065f46',
      cancelled: '#991b1b'
    };
    return map[status] ?? '#6b7280';
  }
}
