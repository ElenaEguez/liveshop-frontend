import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ComprasService, OrdenCompra, OrdenCompraItem, OrdenCompraItemDistribucion } from '../compras.service';

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

  confirmar(): void {
    if (!this.orden?.id) return;
    if (!confirm('¿Confirmar esta orden? Esta acción no se puede deshacer.')) {
      return;
    }
    this.comprasService.confirmarOrden(this.orden.id).subscribe({
      next: (o) => {
        this.orden = o;
        this.snackBar.open('Orden confirmada correctamente', 'Cerrar', { duration: 4000 });
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.detail || 'No se pudo confirmar la orden';
        this.snackBar.open(
          typeof msg === 'string' ? msg : 'No se pudo confirmar la orden',
          'Cerrar',
          { duration: 5000 },
        );
      },
    });
  }

  cancelar(): void {
    if (!this.orden?.id) return;
    this.comprasService.cancelarOrden(this.orden.id).subscribe((o) => (this.orden = o));
  }

  almacenLabel(orden: OrdenCompra, item: OrdenCompraItem): string {
    const raw = item.almacen ?? orden.almacen;
    const id = raw != null && typeof raw === 'object' ? (raw as { id: number }).id : (raw as number | null);
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
