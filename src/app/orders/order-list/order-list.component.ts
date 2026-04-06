import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';

import { Order, OrderStatus, OrderService } from '../services/order.service';
import { OrderDetailComponent } from '../order-detail/order-detail.component';
import { VendorSocketService } from '../../core/vendor-socket.service';
import { VendorProfileService } from '../../my-store/services/vendor-profile.service';
import { PermissionsService } from '../../shared/permissions.service';

@Component({
  selector: 'app-order-list',
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.css']
})
export class OrderListComponent implements OnInit, OnDestroy {

  // ── Data ──────────────────────────────────────────────────────────────────
  orders: Order[] = [];
  loading = false;  sessionId?: number;
  sessionTitle = '';
  // ── Pagination ────────────────────────────────────────────────────────────
  totalCount = 0;
  pageSize   = 20;
  currentPage = 0;  // 0-indexed (MatPaginator convention)

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // ── Filters ───────────────────────────────────────────────────────────────
  searchControl  = new FormControl('');
  selectedStatus: OrderStatus | '' = '';

  // ── Tabs ──────────────────────────────────────────────────────────────────
  activeTabIndex          = 0;
  pendingConfirmationCount = 0;

  // ── WebSocket ─────────────────────────────────────────────────────────────
  wsConnected = false;

  // ── Table columns ─────────────────────────────────────────────────────────
  displayedColumns = [
    'id', 'customer', 'product', 'quantity',
    'total_price', 'status', 'created_at', 'actions'
  ];

  statusOptions: { value: OrderStatus | ''; label: string }[] = [
    { value: '',          label: 'Todos'      },
    { value: 'pending',   label: 'Pendiente'  },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'paid',      label: 'Pagado'     },
    { value: 'recibido',  label: 'Recibido'   },
    { value: 'delivered', label: 'Entregado'  },
    { value: 'cancelled', label: 'Cancelado'  }
  ];

  private subs = new Subscription();

  get canConfirmPayments(): boolean {
    return this.permissionsService.canConfirmPayments();
  }

  constructor(
    private orderService:         OrderService,
    private dialog:               MatDialog,
    private route:                ActivatedRoute,
    private vendorSocket:         VendorSocketService,
    private vendorProfileService: VendorProfileService,
    private permissionsService:   PermissionsService
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Handle ?status=paid query param (from dashboard "Por confirmar" card)
    const queryStatus = this.route.snapshot.queryParamMap.get('status');
    if (queryStatus === 'paid' && this.canConfirmPayments) {
      this.activeTabIndex  = 1;
      this.selectedStatus  = 'paid';
    }

    const querySession = this.route.snapshot.queryParamMap.get('session');
    if (querySession) {
      const sessionNumber = Number(querySession);
      if (!Number.isNaN(sessionNumber) && sessionNumber > 0) {
        this.sessionId = sessionNumber;
      }
    }

    this.loadOrders();
    this.loadPendingCount();
    this.connectSocket();

    // Search debounce
    this.subs.add(
      this.searchControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(() => {
        this.currentPage = 0;
        this.loadOrders();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ── Orders loading ────────────────────────────────────────────────────────

  loadOrders(): void {
    this.loading = true;
    this.orderService.getOrders({
      status:    this.selectedStatus  || undefined,
      search:    this.searchControl.value || undefined,
      session:   this.sessionId,
      page:      this.currentPage + 1,   // API is 1-indexed
      page_size: this.pageSize
    }).subscribe({
      next: res => {
        this.orders     = res.results;
        this.totalCount = res.count;
        if (this.sessionId && !this.sessionTitle && this.orders.length > 0) {
          this.sessionTitle = this.orders[0].session_title || '';
        }
        this.loading    = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private loadPendingCount(): void {
    this.orderService.getOrders({ status: 'paid', page: 1, page_size: 1 }).subscribe({
      next: res => (this.pendingConfirmationCount = res.count),
      error: ()  => {}
    });
  }

  // ── Filters & tabs ────────────────────────────────────────────────────────

  filterByStatus(status: OrderStatus | ''): void {
    this.selectedStatus = status;
    this.currentPage    = 0;
    this.loadOrders();
  }

  onTabChange(index: number): void {
    this.activeTabIndex  = index;
    this.selectedStatus  = index === 1 ? 'paid' : '';
    this.currentPage     = 0;
    this.loadOrders();
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize    = event.pageSize;
    this.loadOrders();
  }

  // ── Detail dialog ─────────────────────────────────────────────────────────

  openDetail(order: Order): void {
    const dialogRef = this.dialog.open(OrderDetailComponent, {
      width: '560px',
      data: { order }
    });
    dialogRef.afterClosed().subscribe(updated => {
      if (updated) {
        this.loadOrders();
        this.loadPendingCount();
      }
    });
  }

  // ── WhatsApp ──────────────────────────────────────────────────────────────

  openWhatsApp(order: Order, event: MouseEvent): void {
    event.stopPropagation();
    const phone = this.cleanPhone(order.customer_phone);
    const text  = encodeURIComponent(
      `Hola ${order.customer_name}, tu pedido está listo`
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

  // ── WebSocket ─────────────────────────────────────────────────────────────

  private connectSocket(): void {
    this.vendorProfileService.getProfile().subscribe({
      next: profile => {
        this.vendorSocket.connect(profile.id);

        // Track connection state
        this.subs.add(
          this.vendorSocket.isConnected.subscribe(
            connected => (this.wsConnected = connected)
          )
        );

        // React to new orders arriving via WS — fetch the full object by ID
        this.subs.add(
          this.vendorSocket.events.pipe(
            filter(e => e.type === 'new_order')
          ).subscribe(e => {
            const reservationId = e.data['reservation_id'] as number;
            if (!reservationId) return;

            this.orderService.getOrder(reservationId).subscribe({
              next: order => {
                // Prepend if not already present; update if existing
                const idx = this.orders.findIndex(o => o.id === order.id);
                if (idx === -1) {
                  this.orders = [order, ...this.orders];
                  this.totalCount++;
                } else {
                  this.orders = this.orders.map(o => o.id === order.id ? order : o);
                }
                // Refresh pending count in case it changed
                this.loadPendingCount();
              },
              error: () => {}
            });
          })
        );
      },
      error: () => {} // TeamMembers or non-vendors: WS not connected, list still works
    });
  }

  // ── Status helpers ────────────────────────────────────────────────────────

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:   'Pendiente',
      confirmed: 'Confirmado',
      paid:      'Pagado',
      recibido:  'Recibido',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    };
    return map[status] ?? status;
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
