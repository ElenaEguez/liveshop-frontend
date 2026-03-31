import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import {
  PosService, Sucursal, Caja, TurnoCaja, MetodoPago,
  ProductoPOS, ProductVariantPOS, CartItem, VentaPOS,
} from '../pos.service';
import { AbrirCajaDialogComponent } from '../abrir-caja-dialog/abrir-caja-dialog.component';
import { CerrarCajaDialogComponent } from '../cerrar-caja-dialog/cerrar-caja-dialog.component';
import { MovimientoCajaDialogComponent } from '../movimiento-caja-dialog/movimiento-caja-dialog.component';
import { TicketPreviewDialogComponent } from '../ticket-preview/ticket-preview-dialog.component';
import { SettingsService, TicketConfig } from '../../settings/settings.service';
import { VendorProfileService } from '../../my-store/services/vendor-profile.service';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
})
export class PosComponent implements OnInit, OnDestroy {
  // ── Estado de caja ─────────────────────────────────────────────────────────
  sucursales: Sucursal[] = [];
  cajas: Caja[] = [];
  selectedSucursal: number | null = null;
  selectedCaja: number | null = null;
  turnoActivo: TurnoCaja | null = null;

  // ── Métodos de pago ────────────────────────────────────────────────────────
  metodosPago: MetodoPago[] = [];
  selectedMetodo: MetodoPago | null = null;

  // ── Búsqueda ───────────────────────────────────────────────────────────────
  searchCtrl = new FormControl('');
  searchResults: ProductoPOS[] = [];
  searching = false;

  // ── Carrito ────────────────────────────────────────────────────────────────
  carrito: CartItem[] = [];
  clienteNombre = 'Genérico';
  clienteTelefono = '';
  descuento = 0;
  montoRecibido: number | null = null;
  esCredito = false;
  plazoDias: number | null = null;
  notas = '';

  // ── Cupón ──────────────────────────────────────────────────────────────────
  cuponCodigo = '';
  cuponAplicado: { descuento: number; codigo: string } | null = null;
  cuponError = '';
  cuponLoading = false;

  // ── Estado UI ──────────────────────────────────────────────────────────────
  cobrando = false;
  vendorName = 'Mi Tienda';
  moneda = 'Bs.';
  now = new Date();
  ticketConfig: TicketConfig | null = null;
  vendorQrImage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private posService: PosService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private settingsService: SettingsService,
    private vendorProfileService: VendorProfileService,
  ) {}

  ngOnInit(): void {
    // Reloj en tiempo real
    setInterval(() => { this.now = new Date(); }, 1000);

    // Lee nombre de tienda del JWT
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const p = JSON.parse(atob(token.split('.')[1]));
        this.vendorName = p.store_name || p.username || 'Mi Tienda';
      } catch { /* keep default */ }
    }

    // Carga configuración de ticket
    this.settingsService.getTicketConfig().subscribe({
      next: cfg => {
        this.ticketConfig = cfg;
        this.moneda = cfg.moneda || 'Bs.';
      },
      error: () => {}
    });

    // Carga QR de la tienda
    this.vendorProfileService.getProfile().subscribe({
      next: p => { this.vendorQrImage = p.payment_qr_image ?? null; },
      error: () => {},
    });

    // Carga sucursales y métodos de pago
    this.posService.getSucursales().subscribe(s => {
      this.sucursales = s.filter(x => x.activa);
      if (this.sucursales.length === 1) {
        this.onSucursalChange(this.sucursales[0].id);
      }
    });

    this.posService.getMetodosPago().subscribe(m => {
      this.metodosPago = m;
    });

    // Búsqueda con debounce
    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => {
      if (q && q.trim().length >= 1) {
        this.searching = true;
        this.posService.buscarProducto(q.trim()).subscribe({
          next: r => { this.searchResults = r; this.searching = false; },
          error: () => { this.searching = false; },
        });
      } else {
        this.searchResults = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Sucursal / Caja ─────────────────────────────────────────────────────────

  onSucursalChange(id: number): void {
    this.selectedSucursal = id;
    this.selectedCaja = null;
    this.turnoActivo = null;
    this.cajas = [];
    this.posService.getCajas(id).subscribe(c => {
      this.cajas = c.filter(x => x.activa);
    });
  }

  onCajaChange(cajaId: number): void {
    this.selectedCaja = cajaId;
    this.posService.getTurnoActivo(cajaId).subscribe(res => {
      this.turnoActivo = res.turno;
      if (!res.turno) {
        this.abrirCajaDialog();
      }
    });
  }

  abrirCajaDialog(): void {
    const ref = this.dialog.open(AbrirCajaDialogComponent, {
      width: '400px',
      disableClose: true,
    });
    ref.afterClosed().subscribe(result => {
      if (result?.turno) {
        this.turnoActivo = result.turno;
        this.selectedCaja = result.caja_id;
      }
    });
  }

  abrirCerrarDialog(): void {
    if (!this.turnoActivo) return;
    const ref = this.dialog.open(CerrarCajaDialogComponent, {
      width: '460px',
      data: { turnoId: this.turnoActivo.id },
    });
    ref.afterClosed().subscribe(result => {
      if (result?.turno) {
        this.turnoActivo = null;
        this.snack.open('Caja cerrada exitosamente.', 'OK', { duration: 3000 });
      }
    });
  }

  abrirMovimientoDialog(tipo: 'ingreso' | 'retiro'): void {
    const ref = this.dialog.open(MovimientoCajaDialogComponent, {
      width: '360px',
      data: { tipo },
    });
    ref.afterClosed().subscribe(result => {
      if (result && this.turnoActivo) {
        this.posService.registrarMovimientoCaja(
          this.turnoActivo.id, tipo, result.concepto, result.monto,
        ).subscribe({
          next: () => {
            const msg = tipo === 'ingreso'
              ? `Ingreso de ${this.moneda} ${result.monto} registrado.`
              : `Retiro de ${this.moneda} ${result.monto} registrado.`;
            this.snack.open(msg, 'OK', { duration: 3000 });
          },
          error: err => {
            this.snack.open(err.error?.error || 'Error al registrar movimiento.', 'OK', { duration: 4000 });
          },
        });
      }
    });
  }

  // ── Carrito ─────────────────────────────────────────────────────────────────

  agregarProducto(product: ProductoPOS, variant: ProductVariantPOS | null = null): void {
    const existing = this.carrito.find(
      c => c.product.id === product.id && c.variant?.id === (variant?.id ?? null),
    );
    const stockDisp = product.stock_disponible;
    const cantActual = existing ? existing.cantidad : 0;

    if (cantActual >= stockDisp) {
      this.snack.open(`Stock insuficiente. Disponible: ${stockDisp}`, 'OK', {
        duration: 3000, panelClass: 'snack-error',
      });
      return;
    }

    if (existing) {
      existing.cantidad++;
      this.carrito = [...this.carrito];
    } else {
      this.carrito = [...this.carrito, { product, variant, cantidad: 1, precio_unitario: Number(product.price) }];
    }
    this.searchResults = [];
    this.searchCtrl.setValue('', { emitEvent: false });
  }

  incrementar(item: CartItem): void {
    if (item.cantidad >= item.product.stock_disponible) {
      this.snack.open(`Stock máximo: ${item.product.stock_disponible}`, 'OK', {
        duration: 2000, panelClass: 'snack-error',
      });
      return;
    }
    item.cantidad++;
    this.carrito = [...this.carrito];
  }

  decrementar(item: CartItem): void {
    if (item.cantidad > 1) {
      item.cantidad--;
      this.carrito = [...this.carrito];
    } else {
      this.eliminarItem(item);
    }
  }

  eliminarItem(item: CartItem): void {
    this.carrito = this.carrito.filter(c => c !== item);
  }

  limpiarCarrito(): void {
    this.carrito = [];
    this.clienteNombre = 'Genérico';
    this.clienteTelefono = '';
    this.descuento = 0;
    this.montoRecibido = null;
    this.esCredito = false;
    this.plazoDias = null;
    this.notas = '';
    this.cuponCodigo = '';
    this.cuponAplicado = null;
    this.cuponError = '';
    this.selectedMetodo = null;
  }

  // ── Cupón ───────────────────────────────────────────────────────────────────

  aplicarCupon(): void {
    if (!this.cuponCodigo.trim()) return;
    this.cuponLoading = true;
    this.cuponError = '';
    this.posService.validarCupon(this.cuponCodigo.trim(), this.subtotal).subscribe({
      next: res => {
        this.cuponLoading = false;
        if (res.valido) {
          this.cuponAplicado = {
            descuento: parseFloat(res.descuento_aplicado || '0'),
            codigo: this.cuponCodigo.trim(),
          };
        } else {
          this.cuponError = res.error || 'Cupón inválido.';
          this.cuponAplicado = null;
        }
      },
      error: () => {
        this.cuponLoading = false;
        this.cuponError = 'Error al validar cupón.';
      },
    });
  }

  quitarCupon(): void {
    this.cuponAplicado = null;
    this.cuponCodigo = '';
    this.cuponError = '';
  }

  // ── Cálculos ────────────────────────────────────────────────────────────────

  get subtotal(): number {
    return this.carrito.reduce((s, c) => s + c.precio_unitario * c.cantidad, 0);
  }

  get descuentoCupon(): number {
    return this.cuponAplicado?.descuento ?? 0;
  }

  get total(): number {
    const desc = Number(this.descuento) || 0;
    return Math.max(0, this.subtotal - desc - this.descuentoCupon);
  }

  get vuelto(): number {
    if (!this.montoRecibido) return 0;
    return Math.max(0, this.montoRecibido - this.total);
  }

  get carritoVacio(): boolean {
    return this.carrito.length === 0;
  }

  // ── Cobrar ──────────────────────────────────────────────────────────────────

  cobrar(): void {
    if (this.carritoVacio || !this.selectedSucursal) return;
    this.cobrando = true;

    const payload = {
      sucursal_id: this.selectedSucursal,
      caja_id: this.selectedCaja ?? null,
      turno_id: this.turnoActivo?.id ?? null,
      cliente_nombre: this.clienteNombre || 'Genérico',
      cliente_telefono: this.clienteTelefono,
      metodo_pago_id: this.selectedMetodo?.id ?? null,
      items: this.carrito.map(c => ({
        product_id: c.product.id,
        variant_id: c.variant?.id ?? null,
        cantidad: c.cantidad,
        precio_unitario: c.precio_unitario,
      })),
      descuento: this.descuento,
      cupon_codigo: this.cuponAplicado?.codigo ?? null,
      monto_recibido: this.montoRecibido ?? null,
      es_credito: this.esCredito,
      plazo_dias: this.esCredito ? this.plazoDias : null,
      notas: this.notas,
    };

    this.posService.crearVenta(payload).subscribe({
      next: venta => {
        this.cobrando = false;
        const ref = this.dialog.open(TicketPreviewDialogComponent, {
          width: '420px',
          data: { venta, vendorName: this.vendorName, moneda: this.moneda, ticketConfig: this.ticketConfig, showNuevaVenta: true },
          disableClose: true,
        });
        ref.afterClosed().subscribe(() => this.limpiarCarrito());
      },
      error: err => {
        this.cobrando = false;
        const msg = err.error?.error || err.error?.detail || 'Error al procesar la venta.';
        this.snack.open(msg, 'OK', { duration: 5000, panelClass: 'snack-error' });
      },
    });
  }

  variantLabel(item: CartItem): string {
    if (!item.variant) return '';
    const parts = [];
    if (item.variant.talla) parts.push(item.variant.talla);
    if (item.variant.color) parts.push(item.variant.color);
    return parts.join(' / ');
  }

  selectMetodo(m: MetodoPago): void {
    this.selectedMetodo = m;
    if (m.tipo !== 'efectivo') this.montoRecibido = null;
    // si el método es de tipo crédito, activa el toggle automáticamente
    if (m.tipo === 'credito') this.esCredito = true;
  }

  onCreditoChange(value: boolean): void {
    this.esCredito = value;
    if (!value) this.plazoDias = null;
  }
}
