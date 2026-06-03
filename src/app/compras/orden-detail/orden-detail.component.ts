import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ComprasService, OrdenCompra, OrdenCompraItem, OrdenCompraItemDistribucion } from '../compras.service';
import { httpErrorMessage } from '../../shared/api-utils';

interface PrecioItemState {
  valor: number;
  original: number;
  actualizado: boolean;
  error: string | null;
  stockRestante: number | null;
}

@Component({
  selector: 'app-orden-detail',
  templateUrl: './orden-detail.component.html',
  styleUrls: ['./orden-detail.component.scss']
})
export class OrdenDetailComponent implements OnInit {
  orden: OrdenCompra | null = null;
  columnas = [
    'producto', 'variante', 'almacen', 'cantidad',
    'costo_unit', 'precio_venta', 'subtotal',
  ];
  almacenes: { id: number; nombre: string }[] = [];

  preciosState: Record<number, PrecioItemState> = {};
  editandoPrecios = false;
  guardandoPrecios = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private comprasService: ComprasService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.comprasService.getAlmacenes().subscribe((a) => {
      const rows = Array.isArray(a) ? a : (a as { results?: unknown[] }).results || [];
      this.almacenes = (rows as { id: number; nombre: string }[]).map((x) => ({
        id: x.id,
        nombre: x.nombre,
      }));
    });
    const id = Number(this.route.snapshot.params['id']);
    if (id) {
      this.comprasService.getOrden(id).subscribe((o) => {
        this.orden = o;
        this.initPreciosState();
      });
    }
  }

  esRecibida(): boolean {
    return this.orden?.estado === 'recibida';
  }

  private initPreciosState(): void {
    this.preciosState = {};
    this.editandoPrecios = false;
    if (!this.orden?.items) {
      return;
    }
    for (const item of this.orden.items) {
      if (item.id == null) {
        continue;
      }
      const precio = Number(item.precio_venta_sugerido) || 0;
      this.preciosState[item.id] = {
        valor: precio,
        original: precio,
        actualizado: false,
        error: null,
        stockRestante: null,
      };
    }
  }

  iniciarEdicionPrecios(): void {
    this.editandoPrecios = true;
    for (const s of Object.values(this.preciosState)) {
      s.actualizado = false;
      s.error = null;
    }
  }

  cancelarEdicionPrecios(): void {
    for (const s of Object.values(this.preciosState)) {
      s.valor = s.original;
      s.error = null;
    }
    this.editandoPrecios = false;
  }

  precioModificado(itemId: number | undefined): boolean {
    if (itemId == null) {
      return false;
    }
    const s = this.preciosState[itemId];
    return s != null && s.valor !== s.original;
  }

  precioClase(itemId: number | undefined): string {
    if (itemId == null) {
      return '';
    }
    const s = this.preciosState[itemId];
    if (!s) {
      return '';
    }
    if (s.error) {
      return 'precio-error';
    }
    if (s.actualizado) {
      return 'precio-actualizado';
    }
    if (this.editandoPrecios && this.precioModificado(itemId)) {
      return 'precio-modificado';
    }
    return '';
  }

  guardarPrecios(): void {
    if (!this.orden?.id) {
      return;
    }

    const cambios = Object.entries(this.preciosState)
      .filter(([, s]) => s.valor !== s.original)
      .map(([id, s]) => ({
        id: Number(id),
        precio_venta_sugerido: s.valor,
      }));

    if (!cambios.length) {
      this.snackBar.open('No hay cambios para guardar', 'Cerrar', { duration: 3000 });
      this.editandoPrecios = false;
      return;
    }

    this.guardandoPrecios = true;
    for (const s of Object.values(this.preciosState)) {
      s.error = null;
    }

    this.comprasService.actualizarPrecios(this.orden.id, cambios).subscribe({
      next: (res) => {
        this.guardandoPrecios = false;
        this.snackBar.open(res.mensaje, 'Cerrar', { duration: 5000 });

        for (const act of res.actualizados) {
          const s = this.preciosState[act.item_id];
          if (s) {
            s.valor = act.precio_nuevo;
            s.original = act.precio_nuevo;
            s.actualizado = true;
            s.stockRestante = act.stock_restante;
          }
          const item = this.orden?.items.find((i) => i.id === act.item_id);
          if (item) {
            item.precio_venta_sugerido = act.precio_nuevo;
            item.precio_venta_es_manual = true;
          }
        }

        for (const err of res.errores) {
          if (err.item_id != null && this.preciosState[err.item_id]) {
            this.preciosState[err.item_id].error = err.error;
          }
        }

        if (res.errores.length === 0) {
          this.editandoPrecios = false;
        }
      },
      error: (err) => {
        this.guardandoPrecios = false;
        this.snackBar.open(
          httpErrorMessage(err, 'Error al guardar precios'),
          'Cerrar',
          { duration: 6000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  volver(): void {
    this.router.navigate(['/compras']);
  }

  editar(): void {
    if (!this.orden?.id) return;
    this.router.navigate(['/compras', this.orden.id, 'edit']);
  }

  /** Cabecera o cada línea deben tener almacén (misma regla que el API). */
  faltaAlmacen(o: OrdenCompra): boolean {
    if (this.almacenId(o)) {
      return false;
    }
    const items = o.items || [];
    if (!items.length) {
      return true;
    }
    return items.some((i) => !this.almacenIdItem(o, i));
  }

  private almacenId(o: OrdenCompra): number | null {
    const raw = o.almacen;
    if (raw == null) {
      return null;
    }
    return typeof raw === 'object' ? (raw as { id: number }).id : (raw as number);
  }

  private almacenIdItem(o: OrdenCompra, item: OrdenCompraItem): number | null {
    const raw = item.almacen ?? o.almacen;
    if (raw == null) {
      return null;
    }
    return typeof raw === 'object' ? (raw as { id: number }).id : (raw as number);
  }

  confirmar(): void {
    if (!this.orden?.id) return;
    if (this.faltaAlmacen(this.orden)) {
      this.snackBar.open(
        'Indique el almacén destino (edite la orden y selecciónelo en la cabecera o en cada línea).',
        'Cerrar',
        { duration: 6000 },
      );
      return;
    }
    if (!confirm('¿Confirmar esta orden? Esta acción no se puede deshacer.')) {
      return;
    }
    this.comprasService.confirmarOrden(this.orden.id).subscribe({
      next: (o) => {
        this.orden = o;
        this.initPreciosState();
        this.snackBar.open('Orden confirmada correctamente', 'Cerrar', { duration: 4000 });
      },
      error: (err) => {
        this.snackBar.open(
          httpErrorMessage(err, 'No se pudo confirmar la orden'),
          'Cerrar',
          { duration: 6000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  cancelar(): void {
    if (!this.orden?.id) return;
    this.comprasService.cancelarOrden(this.orden.id).subscribe((o) => (this.orden = o));
  }

  almacenOrdenLabel(orden: OrdenCompra): string {
    const id = this.almacenId(orden);
    if (id == null) {
      return 'Sin asignar';
    }
    const a = this.almacenes.find((x) => x.id === id);
    return a?.nombre || `#${id}`;
  }

  almacenLabel(orden: OrdenCompra, item: OrdenCompraItem): string {
    const id = this.almacenIdItem(orden, item);
    if (id == null) {
      return '—';
    }
    const a = this.almacenes.find((x) => x.id === id);
    return a?.nombre || `#${id}`;
  }

  labelDistribFila(d: OrdenCompraItemDistribucion): string {
    const det = d.variante_detalle;
    if (det) {
      const p = [det.talla, det.color].filter(Boolean).join(' / ');
      return p || `ID ${det.id}`;
    }
    return `Variante #${d.variante}`;
  }
}
