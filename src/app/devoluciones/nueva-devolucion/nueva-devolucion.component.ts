import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import {
  DevolucionesService,
  VentaParaDevolucion,
  VentaItemParaDevolucion,
  DevolucionPayload,
  MetodoPagoOption,
} from '../../payments/devoluciones.service';

@Component({
  selector: 'app-nueva-devolucion',
  templateUrl: './nueva-devolucion.component.html',
  styleUrls: ['./nueva-devolucion.component.scss'],
})
export class NuevaDevolucionComponent implements OnInit {
  busquedaTicket = '';
  buscando = false;
  errorBusqueda = '';

  venta: VentaParaDevolucion | null = null;

  metodosPago: MetodoPagoOption[] = [];
  metodoPagoDevolucionId: number | null = null;
  motivo = '';
  procesando = false;

  devolucionCreada: any = null;

  constructor(
    private svc: DevolucionesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.svc.getMetodosPago().subscribe({
      next: (list) => {
        this.metodosPago = list;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  onBuscarPorTicket(): void {
    if (!this.busquedaTicket.trim()) {
      return;
    }
    this.buscar(this.svc.buscarVentaPorTicket(this.busquedaTicket.trim()));
  }

  private buscar(obs: any): void {
    this.buscando = true;
    this.errorBusqueda = '';
    this.venta = null;
    this.devolucionCreada = null;
    this.metodoPagoDevolucionId = null;

    obs.subscribe({
      next: (venta: VentaParaDevolucion) => {
        venta.items = venta.items.map((item) => ({
          ...item,
          cantidad_disponible: item.cantidad - item.cantidad_devuelta,
          cantidad_a_devolver: 0,
          seleccionado: false,
        }));
        this.venta = venta;
        this.buscando = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.errorBusqueda = err.error?.error || 'Venta no encontrada';
        this.buscando = false;
        this.cdr.markForCheck();
      },
    });
  }

  onItemCheckboxChange(
    item: VentaItemParaDevolucion,
    checked: boolean
  ): void {
    item.seleccionado = checked;
    if (checked && (item.cantidad_a_devolver === 0 || !item.cantidad_a_devolver)) {
      item.cantidad_a_devolver = item.cantidad_disponible!;
    }
    if (!checked) {
      item.cantidad_a_devolver = 0;
    }
    this.cdr.markForCheck();
  }

  get itemsSeleccionados(): VentaItemParaDevolucion[] {
    return (
      this.venta?.items.filter(
        (i) => i.seleccionado && (i.cantidad_a_devolver || 0) > 0
      ) || []
    );
  }

  get montoEstimado(): number {
    return this.itemsSeleccionados.reduce(
      (sum, i) =>
        sum + (i.cantidad_a_devolver || 0) * i.precio_unitario,
      0
    );
  }

  get puedeConfirmar(): boolean {
    return (
      this.itemsSeleccionados.length > 0
      && this.metodoPagoDevolucionId != null
      && !this.procesando
    );
  }

  onConfirmar(): void {
    if (!this.venta || !this.puedeConfirmar) {
      return;
    }

    const msg =
      `¿Confirmar devolución de dinero por ` +
      `Bs. ${this.montoEstimado.toFixed(2)}?`;

    if (!confirm(msg)) {
      return;
    }

    this.procesando = true;
    const payload: DevolucionPayload = {
      venta: this.venta.id,
      tipo_resolucion: 'devolucion_dinero',
      metodo_pago_devolucion: this.metodoPagoDevolucionId!,
      motivo: this.motivo,
      items: this.itemsSeleccionados.map((i) => ({
        venta_item: i.id,
        cantidad: i.cantidad_a_devolver!,
      })),
    };

    this.svc.crearDevolucion(payload).subscribe({
      next: (dev) => {
        this.devolucionCreada = dev;
        this.procesando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        alert(err.error?.error || 'Error al procesar');
        this.procesando = false;
        this.cdr.markForCheck();
      },
    });
  }

  onNuevaBusqueda(): void {
    this.venta = null;
    this.devolucionCreada = null;
    this.busquedaTicket = '';
    this.metodoPagoDevolucionId = null;
    this.motivo = '';
  }

  onVerHistorial(): void {
    this.router.navigate(['/devoluciones']);
  }
}
