import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import {
  PosService, Sucursal, Caja, TurnoCaja, MetodoPago,
  ProductoPOS, ProductVariantPOS, CartItem, VentaPOS, ScanResult,
} from '../pos.service';
import { AbrirCajaDialogComponent } from '../abrir-caja-dialog/abrir-caja-dialog.component';
import { CerrarCajaDialogComponent } from '../cerrar-caja-dialog/cerrar-caja-dialog.component';
import { MovimientoCajaDialogComponent } from '../movimiento-caja-dialog/movimiento-caja-dialog.component';
import { TicketPreviewDialogComponent } from '../ticket-preview/ticket-preview-dialog.component';
import { SettingsService, TicketConfig } from '../../settings/settings.service';
import { VendorProfileService } from '../../my-store/services/vendor-profile.service';
import { ScannerConfigDialogComponent } from '../scanner-config-dialog/scanner-config-dialog.component';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
})
export class PosComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly Math = Math;

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
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  searchCtrl = new FormControl('');
  searchResults: ProductoPOS[] = [];
  scanResult: ScanResult | null = null;
  searching = false;
  scannerFocused = false;
  scannerStatusMessage = '';
  scannerStatusTimeout: any;

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

  // ── Selector de variante (modal POS) ──────────────────────────────────────
  mostrarSelectorVariante = false;
  productoParaVariante: ProductoPOS | null = null;

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
      next: p => {
        if (!p.payment_qr_image) { this.vendorQrImage = null; return; }
        // La API puede devolver URL relativa (/media/...) o absoluta
        this.vendorQrImage = p.payment_qr_image.startsWith('http')
          ? p.payment_qr_image
          : this.vendorProfileService.mediaBase + p.payment_qr_image;
      },
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

    // Búsqueda solo on enter (para escáner)
    // El debounce se mantiene por si acaso, pero no muestra resultados automáticamente
    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => {
      // No hacer búsqueda automática, solo on enter
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.searchInput?.nativeElement.focus(), 200);
    this.updateScannerStatus();
  }

  updateScannerStatus(): void {
    if (this.scannerStatusTimeout) {
      clearTimeout(this.scannerStatusTimeout);
    }
    if (this.scannerFocused) {
      this.scannerStatusMessage = '✅ Listo para escanear';
      this.scannerStatusTimeout = setTimeout(() => {
        this.scannerStatusMessage = '';
      }, 3000);
    } else {
      this.scannerStatusMessage = '⚠️ Haz clic aquí para escanear';
    }
  }

  onSearchFocus(): void {
    this.scannerFocused = true;
    this.updateScannerStatus();
  }

  onSearchBlur(): void {
    this.scannerFocused = false;
    this.updateScannerStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.scannerStatusTimeout) {
      clearTimeout(this.scannerStatusTimeout);
    }
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

  onSearchEnter(): void {
    const ctrlVal = this.searchCtrl.value?.trim();
    const nativeVal = this.searchInput?.nativeElement.value?.trim();
    console.log('[POS] onSearchEnter → ctrl="' + ctrlVal + '" native="' + nativeVal + '"');
    const q = ctrlVal || nativeVal;
    if (!q) {
      console.warn('[POS] onSearchEnter: q vacío, return anticipado');
      return;
    }
    console.log('[POS] buscarProducto("' + q + '")');
    this.searching = true;
    this.posService.buscarProducto(q).subscribe({
      next: result => {
        this.searching = false;
        this.scanResult = result;
        if (result.match === 'exact' && result.product) {
          this.agregarProducto(result.product);
        } else if (result.match === 'partial' && result.products?.length) {
          this.searchResults = result.products;
        } else {
          // 'none' o 'partial' con 0 resultados
          this.searchResults = [];
          this.snack.open('Producto no encontrado', 'OK', { duration: 2000 });
          this.searchCtrl.setValue('', { emitEvent: false });
          setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
        }
      },
      error: () => { 
        this.searching = false;
        this.snack.open('Error al buscar producto', 'OK', { duration: 2000 });
      },
    });
  }

  openScannerConfig(): void {
    const ref = this.dialog.open(ScannerConfigDialogComponent, {
      width: '520px',
      panelClass: 'scanner-dialog',
    });
    ref.afterClosed().subscribe((barcode: string | undefined) => {
      if (barcode) {
        this.searchCtrl.setValue(barcode, { emitEvent: false });
        this.onSearchEnter();
      }
      setTimeout(() => this.searchInput?.nativeElement.focus(), 100);
    });
  }

  agregarProducto(product: ProductoPOS, variant: ProductVariantPOS | null = null): void {
    // Si no se especificó variante y el producto tiene variantes, abrir selector
    if (variant === null && product.variantes && product.variantes.length > 0) {
      this.productoParaVariante = product;
      this.mostrarSelectorVariante = true;
      this.searchResults = [];
      this.scanResult = null;
      this.searchCtrl.setValue('', { emitEvent: false });
      return;
    }

    const existing = this.carrito.find(
      c => Number(c.product.id) === Number(product.id) &&
           (c.variant?.id ?? null) === (variant?.id ?? null),
    );
    // Usa stock de variante si tiene stock propio; si no, usa stock del producto
    const stockDisp = (variant && variant.stock_extra > 0)
      ? variant.stock_extra
      : product.stock_disponible;
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
      const defaultUnidad = product.sell_by?.length ? product.sell_by[0] : 'unidad';
      this.carrito = [...this.carrito, {
        product, variant, cantidad: 1,
        precio_unitario: Number(product.price),
        descuento_unitario: 0,
        unidad: defaultUnidad,
      }];
    }
    this.searchResults = [];
    this.scanResult = null;
    this.searchCtrl.setValue('', { emitEvent: false });
    setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
  }

  confirmarVariante(variante: ProductVariantPOS): void {
    if (!this.productoParaVariante) return;
    const stockDisp = (variante.stock_extra > 0)
      ? variante.stock_extra
      : this.productoParaVariante.stock_disponible;
    if (stockDisp <= 0) {
      this.snack.open('Esta variante está agotada', 'OK', { duration: 2000 });
      return;
    }
    this.mostrarSelectorVariante = false;
    this.agregarProducto(this.productoParaVariante, variante);
    this.productoParaVariante = null;
    setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
  }

  incrementar(item: CartItem): void {
    const stockDisp = (item.variant && item.variant.stock_extra > 0)
      ? item.variant.stock_extra
      : item.product.stock_disponible;
    if (item.cantidad >= stockDisp) {
      this.snack.open(`Stock máximo: ${stockDisp}`, 'OK', {
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
    return this.carrito.reduce((s, c) => {
      const precioEfectivo = Math.max(0, c.precio_unitario - (c.descuento_unitario || 0));
      return s + precioEfectivo * c.cantidad;
    }, 0);
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
        precio_unitario: Math.max(0, c.precio_unitario - (c.descuento_unitario || 0)),
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
          data: { venta, vendorName: this.vendorName, moneda: this.moneda, ticketConfig: this.ticketConfig, vendorQrImage: this.vendorQrImage, showNuevaVenta: true },
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
