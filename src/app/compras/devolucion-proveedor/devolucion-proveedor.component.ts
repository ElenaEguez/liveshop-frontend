import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ComprasService,
  OrdenCompra,
  OrdenCompraItem,
  ProductoLookup,
} from '../compras.service';
import { ProductService } from '../../products/products.service';

interface Linea {
  producto: number | null;
  variante: number | null;
  almacen: number | null;
  cantidad: number;
  busqueda: string;
  productoNombre: string;
  variantOptions: { id: number; label: string }[];
  sugerenciasLocales: ProductoLookup[];
}

interface LineaOrdenRow {
  item: OrdenCompraItem;
  cantidad: number;
}

@Component({
  selector: 'app-devolucion-proveedor',
  templateUrl: './devolucion-proveedor.component.html',
  styleUrls: ['./devolucion-proveedor.component.scss'],
})
export class DevolucionProveedorComponent implements OnInit {
  modo: 'producto' | 'orden' = 'producto';
  documentoRef = '';
  notas = '';
  almacenes: { id: number; nombre: string; sucursal_nombre?: string }[] = [];
  lineas: Linea[] = [this.nuevaLinea()];
  buscando = false;
  enviando = false;
  mensaje = '';
  error = '';

  ordenesRecibidas: OrdenCompra[] = [];
  ordenSeleccionadaId: number | null = null;
  lineasOrden: LineaOrdenRow[] = [];
  cargandoOrdenes = false;
  cargandoDetalleOrden = false;
  private ordenPreseleccionId: number | null = null;

  constructor(
    private compras: ComprasService,
    private products: ProductService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const raw = this.route.snapshot.queryParamMap.get('orden');
    const n = raw ? Number(raw) : NaN;
    if (!Number.isNaN(n) && n > 0) {
      this.modo = 'orden';
      this.ordenPreseleccionId = n;
    }

    this.compras.getAlmacenes().subscribe({
      next: (rows) => {
        this.almacenes = (rows || []).map((a: any) => ({
          id: a.id,
          nombre: a.nombre,
          sucursal_nombre: a.sucursal_nombre || a.sucursal?.nombre,
        }));
      },
      error: () => {},
    });

    if (this.modo === 'orden') {
      this.cargarOrdenesRecibidas();
    }
  }

  onModoChange(): void {
    this.mensaje = '';
    this.error = '';
    if (this.modo === 'orden') {
      this.cargarOrdenesRecibidas();
    } else {
      this.ordenSeleccionadaId = null;
      this.lineasOrden = [];
    }
  }

  cargarOrdenesRecibidas(): void {
    this.cargandoOrdenes = true;
    this.compras.getOrdenes({ estado: 'recibida' }).subscribe({
      next: (rows) => {
        this.ordenesRecibidas = rows || [];
        this.cargandoOrdenes = false;
        const pending = this.ordenPreseleccionId;
        if (pending != null) {
          this.ordenPreseleccionId = null;
          const exists = this.ordenesRecibidas.some((o) => o.id === pending);
          if (exists) {
            this.ordenSeleccionadaId = pending;
            this.cargarDetalleOrden(pending);
          } else {
            this.compras.getOrden(pending).subscribe({
              next: (o) => {
                if (o.estado === 'recibida' && o.id) {
                  this.ordenesRecibidas = [o, ...this.ordenesRecibidas.filter((x) => x.id !== o.id)];
                  this.ordenSeleccionadaId = o.id;
                  this.aplicarDetalleOrden(o);
                }
              },
              error: () => {},
            });
          }
        }
      },
      error: () => {
        this.cargandoOrdenes = false;
      },
    });
  }

  onOrdenSeleccionada(id: number | null): void {
    this.error = '';
    this.lineasOrden = [];
    if (id == null || id <= 0) {
      return;
    }
    this.cargarDetalleOrden(id);
  }

  cargarDetalleOrden(id: number): void {
    this.cargandoDetalleOrden = true;
    this.compras.getOrden(id).subscribe({
      next: (o) => {
        this.cargandoDetalleOrden = false;
        this.aplicarDetalleOrden(o);
      },
      error: () => {
        this.cargandoDetalleOrden = false;
        this.error = 'No se pudo cargar la orden.';
      },
    });
  }

  private aplicarDetalleOrden(o: OrdenCompra): void {
    const items = o.items || [];
    this.lineasOrden = items.map((it) => ({
      item: it,
      cantidad: 0,
    }));
  }

  almacenNombre(id: number | null | undefined): string {
    if (id == null) {
      return '—';
    }
    const a = this.almacenes.find((x) => x.id === id);
    if (!a) {
      return `#${id}`;
    }
    return a.sucursal_nombre ? `${a.nombre} — ${a.sucursal_nombre}` : a.nombre;
  }

  labelVariante(it: OrdenCompraItem): string {
    const d = it.variante_detalle;
    if (!d) {
      return '—';
    }
    const p = [d.talla, d.color].filter(Boolean).join(' / ');
    return p || `ID ${d.id}`;
  }

  nuevaLinea(): Linea {
    return {
      producto: null,
      variante: null,
      almacen: null,
      cantidad: 1,
      busqueda: '',
      productoNombre: '',
      variantOptions: [],
      sugerenciasLocales: [],
    };
  }

  agregarLinea(): void {
    this.lineas.push(this.nuevaLinea());
  }

  quitarLinea(i: number): void {
    if (this.lineas.length > 1) {
      this.lineas.splice(i, 1);
    }
  }

  buscarProducto(linea: Linea): void {
    const q = (linea.busqueda || '').trim();
    if (q.length < 2) {
      linea.sugerenciasLocales = [];
      return;
    }
    this.buscando = true;
    this.compras.buscarProductos(q).subscribe({
      next: (list) => {
        linea.sugerenciasLocales = list;
        this.buscando = false;
      },
      error: () => {
        this.buscando = false;
      },
    });
  }

  elegirProducto(linea: Linea, p: ProductoLookup): void {
    linea.producto = p.id;
    linea.productoNombre = p.name;
    linea.busqueda = p.name;
    linea.variante = null;
    linea.variantOptions = [];
    linea.sugerenciasLocales = [];
    this.products.getVariantes(p.id).subscribe({
      next: (vars) => {
        linea.variantOptions = (vars || []).map((v) => ({
          id: v.id,
          label: [v.talla, v.color].filter(Boolean).join(' / ') || (v.sku || `ID ${v.id}`),
        }));
      },
      error: () => {},
    });
  }

  private formatApiError(d: unknown): string {
    if (!d || typeof d !== 'object') {
      return 'No se pudo registrar la devolución.';
    }
    const x = d as Record<string, unknown>;
    if (typeof x.detail === 'string') {
      return x.detail;
    }
    if (typeof x.error === 'string') {
      return x.error;
    }
    if (x.orden_compra != null) {
      const oc = x.orden_compra;
      if (Array.isArray(oc) && oc[0] != null) {
        return String(oc[0]);
      }
      return String(oc);
    }
    const items = x.items;
    if (typeof items === 'string') {
      return items;
    }
    if (Array.isArray(items) && items[0] != null) {
      return String(items[0]);
    }
    return 'No se pudo registrar la devolución.';
  }

  enviar(): void {
    this.mensaje = '';
    this.error = '';

    if (this.modo === 'orden') {
      const oid = this.ordenSeleccionadaId;
      if (oid == null) {
        this.error = 'Seleccione una orden de compra recibida.';
        return;
      }
      const items = this.lineasOrden
        .filter((r) => r.cantidad > 0 && r.item.id != null)
        .map((r) => ({
          orden_item_id: r.item.id as number,
          cantidad: r.cantidad,
        }));
      if (!items.length) {
        this.error = 'Indique al menos una cantidad a devolver en las líneas de la orden.';
        return;
      }
      this.enviando = true;
      this.compras
        .registrarDevolucionProveedor({
          documento_ref: this.documentoRef,
          notas: this.notas,
          orden_compra: oid,
          items,
        })
        .subscribe({
          next: () => {
            this.mensaje = 'Devolución registrada. El inventario y las variantes se actualizaron.';
            this.enviando = false;
            this.lineasOrden = this.lineasOrden.map((r) => ({ ...r, cantidad: 0 }));
            this.documentoRef = '';
            this.notas = '';
          },
          error: (err) => {
            this.enviando = false;
            this.error = this.formatApiError(err?.error);
          },
        });
      return;
    }

    const items = this.lineas
      .filter((l) => l.producto && l.almacen && l.cantidad > 0)
      .map((l) => ({
        producto: l.producto as number,
        almacen: l.almacen as number,
        cantidad: l.cantidad,
        ...(l.variante ? { variante: l.variante } : {}),
      }));
    if (!items.length) {
      this.error = 'Complete al menos una línea con producto, almacén y cantidad.';
      return;
    }
    this.enviando = true;
    this.compras
      .registrarDevolucionProveedor({
        documento_ref: this.documentoRef,
        notas: this.notas,
        items,
      })
      .subscribe({
        next: () => {
          this.mensaje = 'Devolución registrada. El inventario y las variantes se actualizaron.';
          this.enviando = false;
          this.lineas = [this.nuevaLinea()];
          this.documentoRef = '';
          this.notas = '';
        },
        error: (err) => {
          this.enviando = false;
          this.error = this.formatApiError(err?.error);
        },
      });
  }
}
