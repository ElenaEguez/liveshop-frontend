import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LiveSession, Reservation, LiveSessionService } from '../services/live-session.service';
import { Product, ProductService } from '../../products/products.service';

interface WsReservationData {
  reservation_id: number;
  customer_name: string;
  product_id: number;
  product_name: string;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
}

interface WsStatusUpdateData {
  reservation_id: number;
  status: string;
}

@Component({
  selector: 'app-live-session-detail',
  templateUrl: './live-session-detail.component.html',
  styleUrls: ['./live-session-detail.component.css']
})
export class LiveSessionDetailComponent implements OnInit, OnDestroy {
  session: LiveSession | null = null;
  products: Product[] = [];
  reservations: Reservation[] = [];
  productAvailableStock = new Map<number, number>();
  sessionId!: number;
  loading = true;
  copied = false;

  get publicUrl(): string {
    return `${window.location.origin}/public/live/${this.session?.slug}`;
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.publicUrl).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }

  productColumns = ['name', 'price', 'stock'];
  reservationColumns = ['customer_name', 'product_name', 'quantity', 'total_price', 'status', 'created_at'];

  private ws: WebSocket | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private liveSessionService: LiveSessionService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.sessionId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadSession();
    this.loadProducts();
    this.loadReservations();
  }

  loadSession(): void {
    this.liveSessionService.getSession(this.sessionId).subscribe(
      session => {
        this.session = session;
        this.loading = false;
        if (session.status === 'live') {
          this.connectWebSocket();
        }
      },
      (error: any) => {
        console.error('Error loading session:', error);
        this.loading = false;
      }
    );
  }

  loadProducts(): void {
    this.productService.getProducts(1).subscribe(
      (response: any) => {
        this.products = Array.isArray(response) ? response : (response.results ?? []);
        this.recalculateAvailableStock();
      },
      (error: any) => console.error('Error loading products:', error)
    );
  }

  loadReservations(): void {
    this.liveSessionService.getSessionReservations(this.sessionId).subscribe(
      reservations => {
        this.reservations = reservations;
        this.recalculateAvailableStock();
      },
      (error: any) => console.error('Error loading reservations:', error)
    );
  }

  private readonly ACTIVE_RESERVATION_STATUSES = new Set(['pending', 'confirmed', 'shipped', 'paid']);

  recalculateAvailableStock(): void {
    this.productAvailableStock.clear();
    for (const product of this.products) {
      const reserved = this.reservations
        .filter(r => r.product === product.id && this.ACTIVE_RESERVATION_STATUSES.has(r.status))
        .reduce((sum, r) => sum + r.quantity, 0);
      this.productAvailableStock.set(product.id!, Math.max(0, (product.stock ?? 0) - reserved));
    }
  }

  getAvailableStock(product: Product): number {
    return this.productAvailableStock.get(product.id!) ?? product.stock ?? 0;
  }

  connectWebSocket(): void {
    this.ws = new WebSocket(`ws://localhost:8000/ws/session/${this.sessionId}/`);

    this.ws.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'new_reservation') {
        const d: WsReservationData = msg.data;
        const reservation: Reservation = {
          id: d.reservation_id,
          session: this.sessionId,
          product: d.product_id,
          product_name: d.product_name,
          customer_name: d.customer_name,
          customer_phone: '',
          quantity: d.quantity,
          status: d.status as any,
          total_price: d.total_price,
          created_at: d.created_at
        };
        this.reservations = [reservation, ...this.reservations];
        this.recalculateAvailableStock();
      } else if (msg.type === 'reservation_update') {
        const d: WsStatusUpdateData = msg.data;
        const existing = this.reservations.find(r => r.id === d.reservation_id);
        if (existing) {
          existing.status = d.status as any;
          this.reservations = [...this.reservations];
          this.recalculateAvailableStock();
        }
      }
    };

    this.ws.onerror = (error: Event) => console.error('WebSocket error:', error);
  }

  startSession(): void {
    this.liveSessionService.startSession(this.sessionId).subscribe(
      updated => {
        this.session = updated;
        this.connectWebSocket();
      },
      (error: any) => console.error('Error starting session:', error)
    );
  }

  endSession(): void {
    if (confirm('¿Finalizar el live? No podrás reactivarlo.')) {
      this.liveSessionService.endSession(this.sessionId).subscribe(
        updated => {
          this.session = updated;
          this.disconnectWebSocket();
        },
        (error: any) => console.error('Error ending session:', error)
      );
    }
  }

  goBack(): void {
    this.router.navigate(['/live-sessions']);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      scheduled: 'Programada',
      live: '🔴 En vivo',
      ended: 'Finalizada'
    };
    return labels[status] ?? status;
  }

  getStatusBg(status: string): string {
    const map: Record<string, string> = {
      scheduled: '#fef9c3',
      live: '#dcfce7',
      ended: '#f3f4f6'
    };
    return map[status] ?? '#f3f4f6';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      scheduled: '#854d0e',
      live: '#166534',
      ended: '#6b7280'
    };
    return map[status] ?? '#6b7280';
  }

  getReservationStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
      paid: 'Pagada'
    };
    return map[status] ?? status;
  }

  private disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnectWebSocket();
  }
}
