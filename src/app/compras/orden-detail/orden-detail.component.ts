import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ComprasService, OrdenCompra, OrdenCompraItem, OrdenCompraItemDistribucion } from '../compras.service';
import { httpErrorMessage } from '../../shared/api-utils';

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
      this.comprasService.getOrden(id).subscribe((o) => (this.orden = o));
    }
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
