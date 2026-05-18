import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  ComprasService,
  OrdenCompra,
  OrdenCompraItem,
  ProductoLookup,
  Proveedor,
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
  tipo: 'item' | 'distribucion';
  ordenItemId?: number;
  distribucionId?: number;
  productoNombre: string;
  varianteLabel: string;
  almacenId: number | null;
  cantidadComprada: number;
  cantidadYaDevuelta: number;
  maxDevolver: number;
  cantidad: number;
  puedeDevolver: boolean;
  productoId?: number;
  varianteId?: number | null;
}

interface DevolucionBuscarItem {
  item_id: number;
  orden_item_id: number;
  orden_distribucion_id: number | null;
  producto_id: number;
  producto_nombre: string;
  variante_id: number | null;
  variante_descripcion: string;
  cantidad_comprada: number;
  cantidad_ya_devuelta: number;
  puede_devolver: boolean;
  almacen_id: number;
}

interface DevolucionBuscarOrden {
  orden_id: number;
  numero_orden: string;
  proveedor_id: number | null;
  proveedor_nombre: string;
  fecha: string;
  almacen: string;
  almacen_id: number | null;
  items: DevolucionBuscarItem[];
}

@Component({
  selector: 'app-devolucion-proveedor',
  templateUrl: './devolucion-proveedor.component.html',
  styleUrls: ['./devolucion-proveedor.component.scss'],
})
export class DevolucionProveedorComponent implements OnInit, OnDestroy {
  modo: 'producto' | 'orden' = 'producto';
  documentoRef = '';
  notas = '';
  almacenes: { id: number; nombre: string; sucursal_nombre?: string }[] = [];
  lineas: Linea[] = [this.nuevaLinea()];
  buscando = false;
  enviando = false;
  mensaje = '';
  error = '';

  proveedores: Proveedor[] = [];
  filtroProveedorId: number | null = null;
  busquedaControl = new FormControl('');
  resultadosBusqueda: DevolucionBuscarOrden[] = [];
  cargandoBusqueda = false;
  ordenSeleccionadaInfo: DevolucionBuscarOrden | null = null;

  ordenesRecibidas: OrdenCompra[] = [];
  ordenSeleccionadaId: number | null = null;
  lineasOrden: LineaOrdenRow[] = [];
  cargandoOrdenes = false;
  cargandoDetalleOrden = false;
  private ordenPreseleccionId: number | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly busqueda$ = new Subject<string>();

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

    this.compras.getProveedores().subscribe({
      next: (rows) => { this.proveedores = rows || []; },
      error: () => {},
    });

    this.busqueda$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.ejecutarBusqueda());

    this.busquedaControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((v) => {
        this.busqueda$.next((v || '').trim());
      });

    if (this.modo === 'orden') {
      this.cargarOrdenesRecibidas();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onModoChange(): void {
    this.mensaje = '';
    this.error = '';
    this.resultadosBusqueda = [];
    this.ordenSeleccionadaInfo = null;
    if (this.modo === 'orden') {
      this.cargarOrdenesRecibidas();
    } else {
      this.ordenSeleccionadaId = null;
      this.lineasOrden = [];
    }
  }

  onProveedorChange(): void {
    this.ordenSeleccionadaId = null;
    this.ordenSeleccionadaInfo = null;
    this.lineasOrden = [];
    this.ejecutarBusqueda();
  }

  ejecutarBusqueda(): void {
    const q = (this.busquedaControl.value || '').trim();
    if (!q && this.filtroProveedorId == null) {
      this.resultadosBusqueda = [];
      return;
    }
    this.cargandoBusqueda = true;
    this.compras.buscarDevolucion({
      q: q || undefined,
      proveedor_id: this.filtroProveedorId ?? undefined,
    }).subscribe({
      next: (rows) => {
        this.resultadosBusqueda = rows || [];
        this.cargandoBusqueda = false;
      },
      error: () => {
        this.cargandoBusqueda = false;
        this.resultadosBusqueda = [];
      },
    });
  }

  seleccionarOrdenBusqueda(orden: DevolucionBuscarOrden): void {
    this.ordenSeleccionadaId = orden.orden_id;
    this.ordenSeleccionadaInfo = orden;
    this.aplicarItemsBusqueda(orden);
  }

  private aplicarItemsBusqueda(orden: DevolucionBuscarOrden): void {
    this.lineasOrden = (orden.items || []).map((it) => {
      const maxDev = Math.max(
        0,
        it.cantidad_comprada - (it.cantidad_ya_devuelta || 0),
      );
      return {
        tipo: it.orden_distribucion_id ? 'distribucion' as const : 'item' as const,
        ordenItemId: it.orden_item_id,
        distribucionId: it.orden_distribucion_id ?? undefined,
        productoNombre: it.producto_nombre,
        varianteLabel: it.variante_descripcion || '—',
        almacenId: it.almacen_id,
        cantidadComprada: it.cantidad_comprada,
        cantidadYaDevuelta: it.cantidad_ya_devuelta || 0,
        maxDevolver: maxDev,
        puedeDevolver: it.puede_devolver && maxDev > 0,
        cantidad: 0,
        productoId: it.producto_id,
        varianteId: it.variante_id,
      };
    });
  }

  cargarDetalleOrdenPorId(id: number): void {
    this.cargandoDetalleOrden = true;
    this.compras.buscarDevolucion({ orden_id: id }).subscribe({
      next: (rows) => {
        this.cargandoDetalleOrden = false;
        const orden = rows?.[0];
        if (orden) {
          this.ordenSeleccionadaInfo = orden;
          this.aplicarItemsBusqueda(orden);
        } else {
          this.compras.getOrden(id).subscribe({
            next: (o) => this.aplicarDetalleOrdenLegacy(o),
            error: () => {
              this.error = 'No se pudo cargar la orden.';
            },
          });
        }
      },
      error: () => {
        this.cargandoDetalleOrden = false;
        this.error = 'No se pudo cargar la orden.';
      },
    });
  }

  devolverTodaLaOrden(): void {
    this.lineasOrden = this.lineasOrden.map((r) => {
      if (!r.puedeDevolver) {
        return { ...r, cantidad: 0 };
      }
      return { ...r, cantidad: r.maxDevolver };
    });
  }

  get resumenDevolucion(): string {
    if (this.modo === 'orden') {
      const activas = this.lineasOrden.filter((r) => r.cantidad > 0 && r.puedeDevolver);
      if (!activas.length) {
        return '';
      }
      const variantes = activas.length;
      const prov = this.ordenSeleccionadaInfo?.proveedor_nombre
        || this.ordenesRecibidas.find((o) => o.id === this.ordenSeleccionadaId)?.proveedor_data?.nombre
        || 'proveedor';
      const alm = this.ordenSeleccionadaInfo?.almacen
        || this.almacenNombre(activas[0].almacenId);
      return `Devolviendo ${variantes} línea${variantes !== 1 ? 's' : ''} al proveedor ${prov}, almacén ${alm}`;
    }
    const lineas = this.lineas.filter((l) => l.producto && l.almacen && l.cantidad > 0);
    if (!lineas.length) {
      return '';
    }
    const alm = this.almacenNombre(lineas[0].almacen);
    return `Devolviendo ${lineas.length} producto${lineas.length !== 1 ? 's' : ''}, almacén ${alm}`;
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
          this.ordenSeleccionadaId = pending;
          this.cargarDetalleOrdenPorId(pending);
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
    this.ordenSeleccionadaInfo = null;
    if (id == null || id <= 0) {
      return;
    }
    this.cargarDetalleOrdenPorId(id);
  }

  private aplicarDetalleOrdenLegacy(o: OrdenCompra): void {
    const rows: LineaOrdenRow[] = [];
    for (const it of o.items || []) {
      const pname = it.producto_nombre || '—';
      const almId = this.almacenIdParaItem(o, it);
      const dists = it.distribuciones || [];
      if (dists.length) {
        for (const d of dists) {
          const vd = d.variante_detalle;
          const vl = vd
            ? [vd.talla, vd.color].filter(Boolean).join(' / ')
            : `Var #${d.variante}`;
          rows.push({
            tipo: 'distribucion',
            distribucionId: d.id,
            productoNombre: pname,
            varianteLabel: vl,
            almacenId: almId,
            cantidadComprada: d.cantidad,
            cantidadYaDevuelta: 0,
            maxDevolver: d.cantidad,
            puedeDevolver: true,
            cantidad: 0,
          });
        }
      } else if (it.id != null) {
        rows.push({
          tipo: 'item',
          ordenItemId: it.id,
          productoNombre: pname,
          varianteLabel: this.labelVariante(it),
          almacenId: almId,
          cantidadComprada: it.cantidad,
          cantidadYaDevuelta: 0,
          maxDevolver: it.cantidad,
          puedeDevolver: true,
          cantidad: 0,
        });
      }
    }
    this.lineasOrden = rows;
  }

  private almacenIdParaItem(o: OrdenCompra, it: OrdenCompraItem): number | null {
    const raw = it.almacen ?? o.almacen;
    if (raw == null) {
      return null;
    }
    return typeof raw === 'object' ? (raw as { id: number }).id : (raw as number);
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
        .filter((r) => r.cantidad > 0 && r.puedeDevolver)
        .map((r) => {
          if (r.tipo === 'distribucion') {
            return {
              orden_distribucion_id: r.distribucionId as number,
              cantidad: r.cantidad,
            };
          }
          return {
            orden_item_id: r.ordenItemId as number,
            cantidad: r.cantidad,
          };
        });
      if (!items.length) {
        this.error = 'Indique al menos una cantidad a devolver en líneas permitidas.';
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
            if (oid) {
              this.cargarDetalleOrdenPorId(oid);
            }
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
