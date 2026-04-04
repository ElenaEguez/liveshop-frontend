import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VendorEvent {
  type: 'payment_submitted' | 'payment_confirmed' | 'payment_rejected' | 'new_order';
  data: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class VendorSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private events$    = new Subject<VendorEvent>();
  private connected$ = new BehaviorSubject<boolean>(false);
  private currentVendorId: number | null = null;

  /** Observable of all vendor-level WebSocket events. */
  get events(): Observable<VendorEvent> {
    return this.events$.asObservable();
  }

  /** Observable that emits true when the WS connection is open. */
  get isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  /** Connect to the vendor WS channel. Safe to call multiple times — reconnects only if vendor changes. */
  connect(vendorId: number): void {
    if (this.ws && this.currentVendorId === vendorId) return;
    this.disconnect();
    this.currentVendorId = vendorId;
    this.ws = new WebSocket(`${environment.wsUrl}/vendor/${vendorId}/`);

    this.ws.onopen  = () => this.connected$.next(true);
    this.ws.onclose = () => this.connected$.next(false);
    this.ws.onerror = () => this.connected$.next(false);

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data) as VendorEvent;
        this.events$.next(msg);
      } catch { /* ignore parse errors */ }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.currentVendorId = null;
      this.connected$.next(false);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.events$.complete();
    this.connected$.complete();
  }
}
