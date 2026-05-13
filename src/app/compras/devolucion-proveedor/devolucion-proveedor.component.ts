import { Component, OnInit } from '@angular/core';
import { ComprasService, ProductoLookup } from '../compras.service';
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

@Component({
  selector: 'app-devolucion-proveedor',
  templateUrl: './devolucion-proveedor.component.html',
  styleUrls: ['./devolucion-proveedor.component.scss'],
})
export class DevolucionProveedorComponent implements OnInit {
  documentoRef = '';
  notas = '';
  almacenes: { id: number; nombre: string; sucursal_nombre?: string }[] = [];
  lineas: Linea[] = [this.nuevaLinea()];
  buscando = false;
  enviando = false;
  mensaje = '';
  error = '';

  constructor(private compras: ComprasService, private products: ProductService) {}

  ngOnInit(): void {
    this.compras.getAlmacenes().subscribe({
      next: rows => {
        this.almacenes = (rows || []).map((a: any) => ({
          id: a.id,
          nombre: a.nombre,
          sucursal_nombre: a.sucursal_nombre || a.sucursal?.nombre,
        }));
      },
      error: () => {},
    });
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
      next: list => {
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
      next: vars => {
        linea.variantOptions = (vars || []).map(v => ({
          id: v.id,
          label: [v.talla, v.color].filter(Boolean).join(' / ') || (v.sku || `ID ${v.id}`),
        }));
      },
      error: () => {},
    });
  }

  enviar(): void {
    this.mensaje = '';
    this.error = '';
    const items = this.lineas
      .filter(l => l.producto && l.almacen && l.cantidad > 0)
      .map(l => ({
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
          const d = err?.error;
          this.error =
            (typeof d === 'object' && d?.items?.[0]) ||
            d?.error ||
            d?.detail ||
            'No se pudo registrar la devolución.';
        },
      });
  }
}
