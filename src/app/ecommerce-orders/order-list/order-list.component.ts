import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  EcommerceOrdersService,
  EcomOrder,
  EcomOrderStatus,
  EcomOrderFilters
} from '../ecommerce-orders.service';
import { OrderDetailComponent } from '../order-detail/order-detail.component';
import { VendorProfileService } from '../../my-store/services/vendor-profile.service';

interface StatusTab {
  label: string;
  value: EcomOrderStatus | '';
}

@Component({
  selector: 'app-order-list',
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.scss']
})
export class OrderListComponent implements OnInit {

  readonly tabs: StatusTab[] = [
    { label: 'Todos',       value: '' },
    { label: 'Pendientes',  value: 'pending' },
    { label: 'Confirmados', value: 'confirmed' },
    { label: 'Entregados',  value: 'delivered' },
    { label: 'Cancelados',  value: 'cancelled' },
  ];

  readonly displayedColumns = ['id', 'customer', 'total', 'payment', 'delivery', 'status', 'actions'];

  orders: EcomOrder[] = [];
  totalCount = 0;
  pageSize = 15;
  currentPage = 1;
  loading = false;
  error = '';
  search = '';
  activeTab: EcomOrderStatus | '' = '';
  vendorSlug = '';

  readonly paymentLabels: Record<string, string> = {
    tigo_money: 'Tigo Money',
    banco_union: 'Banco Unión',
    efectivo: 'Efectivo'
  };

  readonly deliveryLabels: Record<string, string> = {
    pickup: 'Recoger',
    delivery: 'Domicilio'
  };

  readonly statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    pending_confirmation: 'Comprobante enviado',
    confirmed: 'Confirmado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };

  constructor(
    private service: EcommerceOrdersService,
    private dialog: MatDialog,
    private vendorProfileService: VendorProfileService
  ) {}

  ngOnInit(): void {
    this.load();
    this.vendorProfileService.getProfile().subscribe({
      next: p => { this.vendorSlug = p.slug; },
      error: () => {}
    });
  }

  normalizeStatus(value: string): string {
    return (value || '').toString().trim().toLowerCase();
  }

  getStatusLabel(status: string): string {
    const normalized = this.normalizeStatus(status);
    return this.statusLabels[normalized] || normalized;
  }

  isPendingState(status: string): boolean {
    const normalized = this.normalizeStatus(status);
    return normalized === 'pending' || normalized === 'pending_confirmation';
  }

  isCancelableState(status: string): boolean {
    const normalized = this.normalizeStatus(status);
    return normalized === 'pending' || normalized === 'pending_confirmation' || normalized === 'confirmed';
  }

  load(): void {
    this.loading = true;
    this.error = '';

    const filters: EcomOrderFilters = {
      page: this.currentPage,
      page_size: this.pageSize,
    };
    if (this.activeTab) filters.status = this.activeTab;
    if (this.search.trim()) filters.search = this.search.trim();

    this.service.getOrders(filters).subscribe({
      next: (res) => {
        this.orders = res.results;
        this.totalCount = res.count;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los pedidos.';
        this.loading = false;
      }
    });
  }

  onTabChange(value: EcomOrderStatus | ''): void {
    this.activeTab = value;
    this.currentPage = 1;
    this.load();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.load();
  }

  clearSearch(): void {
    this.search = '';
    this.currentPage = 1;
    this.load();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.load();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  openDetail(order: EcomOrder): void {
    this.service.getOrder(order.id).subscribe({
      next: (freshOrder) => {
        const ref = this.dialog.open(OrderDetailComponent, {
          width: '860px',
          maxWidth: '98vw',
          height: 'auto',
          maxHeight: '95vh',
          data: { order: freshOrder },
          panelClass: 'detail-panel'
        });

        ref.afterClosed().subscribe(changed => {
          if (changed) this.load();
        });
      },
      error: () => {
        this.error = 'No se pudo cargar el detalle del pedido.';
      }
    });
  }

  quickConfirm(event: Event, order: EcomOrder): void {
    event.stopPropagation();
    this.service.confirmOrder(order.id).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }

  quickCancel(event: Event, order: EcomOrder): void {
    event.stopPropagation();
    this.service.cancelOrder(order.id).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }
}
