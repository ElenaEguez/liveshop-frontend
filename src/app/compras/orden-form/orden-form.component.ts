import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import {
  ComprasService, OrdenCompra, OrdenCompraItem,
  Proveedor, ProductoLookup, VarianteDetalle, OrdenCompraItemDistribucion
} from '../compras.service';

@Component({
  selector: 'app-orden-form',
  templateUrl: './orden-form.component.html',
  styleUrls: ['./orden-form.component.scss']
})
export class OrdenFormComponent implements OnInit {

  form!: FormGroup;
  items: OrdenCompraItem[] = [];
  proveedores: Proveedor[] = [];
  almacenes: any[] = [];
  productosFiltrados: ProductoLookup[] = [];
  productoSeleccionado: ProductoLookup | null = null;
  variantesDisponibles: VarianteDetalle[] = [];
  /** Conteos por variante mientras se arma un ítem (fiel al Excel). */
  distribCants: Record<number, number> = {};
  itemForm!: FormGroup;

  ordenId: number | null = null;
  ordenNumero = '';
  guardando = false;
  modoEdicion = false;

  private busquedaSubject = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private comprasService: ComprasService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.cargarDatos();
    this.configurarBusqueda();
    this.configurarCalculos();

    this.ordenId = this.route.snapshot.params['id']
      ? +this.route.snapshot.params['id'] : null;
    if (this.ordenId) {
      this.modoEdicion = true;
      this.cargarOrden(this.ordenId);
    }
  }

  private initForms(): void {
    const hoy = new Date().toISOString().substring(0, 10);
    this.form = this.fb.group({
      proveedor: [null],
      fecha: [hoy, Validators.required],
      factura_compra: [''],
      almacen: [null],
    });

    this.itemForm = this.fb.group({
      busqueda: [''],
      descripcion: [''],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      costo_mercaderia: [0, [Validators.required, Validators.min(0)]],
      flete_unitario: [0, [Validators.min(0)]],
      costo_unitario_total: [{ value: 0, disabled: true }],
      porcentaje_ganancia: [50, [Validators.min(0)]],
      precio_venta_manual: [false],
      precio_venta_sugerido: [{ value: 0, disabled: true }],
      precio_unitario: [0, [Validators.required, Validators.min(0)]],
    });
    this.itemForm.get('precio_venta_sugerido')?.disable({ emitEvent: false });
  }

  private configurarCalculos(): void {
    const f = this.itemForm;
    const aplicar = () => this.aplicarFormulaCostoYPrecio();
    ['costo_mercaderia', 'flete_unitario', 'porcentaje_ganancia']
      .forEach(c => f.get(c)?.valueChanges.subscribe(() => aplicar()));
    f.get('precio_venta_manual')?.valueChanges.subscribe((manual: boolean) => {
      const pctl = f.get('precio_venta_sugerido');
      if (manual) {
        pctl?.enable({ emitEvent: false });
      } else {
        pctl?.disable({ emitEvent: false });
        aplicar();
      }
    });
  }

  private aplicarFormulaCostoYPrecio(): void {
    const f = this.itemForm;
    const costo = +(f.get('costo_mercaderia')?.value || 0);
    const flete = +(f.get('flete_unitario')?.value || 0);
    const pct = +(f.get('porcentaje_ganancia')?.value || 0);
    const total = costo + flete;
    const pventa = pct > 0 ? +(total * (1 + pct / 100)).toFixed(2) : total;
    f.get('costo_unitario_total')?.setValue(total, { emitEvent: false });
    if (!f.get('precio_venta_manual')?.value) {
      f.get('precio_venta_sugerido')?.setValue(pventa, { emitEvent: false });
    }
    const pu = f.get('precio_unitario')?.value;
    if (pu === null || pu === '' || +pu === 0) {
      f.get('precio_unitario')?.setValue(total, { emitEvent: false });
    }
  }

  private cargarDatos(): void {
    this.comprasService.getProveedores().subscribe(p => {
      this.proveedores = p;
      this.cdr.markForCheck();
    });
    this.comprasService.getAlmacenes().subscribe(a => {
      this.almacenes = Array.isArray(a) ? a : (a.results || []);
      this.cdr.markForCheck();
    });
  }

  private configurarBusqueda(): void {
    this.busquedaSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      const q = (query || '').trim();
      if (q.length < 2) {
        this.productosFiltrados = [];
        this.cdr.markForCheck();
        return;
      }
      this.comprasService.buscarProductos(q).subscribe(p => {
        this.productosFiltrados = p;
        this.cdr.markForCheck();
      });
    });
  }

  onBusquedaChange(value: string): void {
    this.busquedaSubject.next(value);
  }

  onSeleccionarProducto(producto: ProductoLookup): void {
    this.productoSeleccionado = producto;
    this.variantesDisponibles = producto.variantes || [];
    this.distribCants = {};
    for (const v of this.variantesDisponibles) {
      this.distribCants[v.id] = 0;
    }
    this.itemForm.patchValue({
      busqueda: producto.name,
      costo_mercaderia: 0,
      precio_unitario: 0,
      precio_venta_manual: false,
    });
    this.itemForm.get('precio_venta_sugerido')?.disable({ emitEvent: false });
    this.aplicarFormulaCostoYPrecio();
    this.productosFiltrados = [];
    this.cdr.markForCheck();
  }

  setDistribCant(varianteId: number, ev: Event): void {
    const raw = (ev.target as HTMLInputElement).value;
    this.distribCants[varianteId] = Math.max(0, this.toNum(raw, 0));
    this.cdr.markForCheck();
  }

  get sumDistribucionEdicion(): number {
    return this.variantesDisponibles.reduce(
      (s, v) => s + this.toNum(this.distribCants[v.id], 0),
      0,
    );
  }

  get costoUnitarioTotal(): number {
    return +(this.itemForm.get('costo_unitario_total')?.value || 0);
  }

  get precioVentaSugerido(): number {
    return +(this.itemForm.get('precio_venta_sugerido')?.value || 0);
  }

  get subtotalItem(): number {
    const cant = +(this.itemForm.get('cantidad')?.value || 0);
    const precio = +(this.itemForm.get('precio_unitario')?.value || 0);
    return cant * precio;
  }

  onAgregarItem(): void {
    if (!this.productoSeleccionado) {
      alert('Selecciona un producto');
      return;
    }
    if (this.itemForm.invalid) {
      return;
    }

    const v = this.itemForm.getRawValue();
    const cantidad = this.toNum(v.cantidad, 1);
    const precioVentaManual = !!v.precio_venta_manual;
    const pvs = this.toNum(v.precio_venta_sugerido, 0);

    let distribuciones: OrdenCompraItemDistribucion[] | undefined;
    if (this.variantesDisponibles.length > 0) {
      const sum = this.sumDistribucionEdicion;
      if (sum !== cantidad) {
        alert(
          `La distribución por variantes suma ${sum} uds. y debe ser igual a la cantidad total (${cantidad}).`
        );
        return;
      }
      distribuciones = this.variantesDisponibles
        .map(vr => ({
          variante: vr.id,
          variante_detalle: vr,
          cantidad: this.toNum(this.distribCants[vr.id], 0),
        }))
        .filter(d => d.cantidad > 0);
    }

    const nuevoItem: OrdenCompraItem = {
      producto: this.productoSeleccionado.id,
      producto_nombre: this.productoSeleccionado.name,
      variante: null,
      variante_detalle: null,
      distribuciones,
      descripcion: v.descripcion,
      cantidad,
      costo_mercaderia: v.costo_mercaderia,
      flete_unitario: v.flete_unitario,
      costo_unitario_total: v.costo_unitario_total,
      porcentaje_ganancia: v.porcentaje_ganancia,
      precio_venta_sugerido: pvs,
      precio_venta_es_manual: precioVentaManual,
      precio_unitario: v.precio_unitario,
      subtotal: cantidad * v.precio_unitario,
    };

    this.items = [...this.items, nuevoItem];
    this.limpiarItemForm();
    this.cdr.markForCheck();
  }

  onEliminarItem(index: number): void {
    this.items = this.items.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  private limpiarItemForm(): void {
    this.productoSeleccionado = null;
    this.variantesDisponibles = [];
    this.distribCants = {};
    this.itemForm.reset({
      busqueda: '',
      descripcion: '',
      cantidad: 1,
      costo_mercaderia: 0,
      flete_unitario: 0,
      porcentaje_ganancia: 50,
      precio_unitario: 0,
      precio_venta_manual: false,
    });
    this.itemForm.get('precio_venta_sugerido')?.disable({ emitEvent: false });
    this.aplicarFormulaCostoYPrecio();
  }

  get subtotal(): number {
    return this.items.reduce((s, i) => s + (i.subtotal || 0), 0);
  }

  get total(): number {
    return this.subtotal;
  }

  get cantidadTotal(): number {
    return this.items.reduce((s, i) => s + this.toNum(i.cantidad, 0), 0);
  }

  get totalCostos(): number {
    return this.items.reduce(
      (s, i) => s + this.toNum(i.cantidad, 0) * this.toNum(i.costo_unitario_total, 0),
      0
    );
  }

  getAlmacenNombre(id: number | null | undefined): string {
    if (!id) {
      return '—';
    }
    const a = this.almacenes.find((x: any) => x.id === id);
    return a?.nombre || String(id);
  }

  resolveAlmacenItem(item: OrdenCompraItem): number | null {
    const raw = item.almacen as unknown;
    const id = raw != null && typeof raw === 'object'
      ? (raw as { id: number }).id
      : (raw as number | null | undefined);
    if (typeof id === 'number' && !Number.isNaN(id)) {
      return id;
    }
    const cab = this.form?.get('almacen')?.value;
    return cab != null && cab !== '' ? cab : null;
  }

  labelDistribFila(d: OrdenCompraItemDistribucion): string {
    const det = d.variante_detalle;
    if (det) {
      const p = [det.talla, det.color].filter(Boolean).join(' / ');
      return p || `ID ${det.id}`;
    }
    return `Variante #${d.variante}`;
  }

  private toNum(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private buildPayload(estado: string): Partial<OrdenCompra> {
    const alm = this.form.value.almacen;
    return {
      ...this.form.value,
      sucursal: null,
      fecha_entrega: null,
      notas: '',
      descuento: 0,
      estado: estado as any,
      items: this.items.map(i => ({
        id: i.id,
        producto: i.producto,
        variante: i.variante || null,
        distribuciones: (i.distribuciones || []).map(d => ({
          variante: d.variante,
          cantidad: this.toNum(d.cantidad, 0),
        })),
        descripcion: i.descripcion || '',
        cantidad: this.toNum(i.cantidad, 1),
        costo_mercaderia: this.toNum(i.costo_mercaderia, 0),
        flete_unitario: this.toNum(i.flete_unitario, 0),
        porcentaje_ganancia: this.toNum(i.porcentaje_ganancia, 0),
        precio_unitario: this.toNum(i.precio_unitario, 0),
        precio_venta_es_manual: !!i.precio_venta_es_manual,
        precio_venta_sugerido: this.toNum(i.precio_venta_sugerido, 0),
      })),
      almacen: alm != null && alm !== '' ? alm : null,
    };
  }

  onGuardarBorrador(): void { this.guardar('borrador'); }

  onEnviarPendiente(): void {
    if (this.items.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }
    if (!this.form.get('almacen')?.value) {
      alert('Seleccione el almacén destino de la compra (recepción).');
      return;
    }
    this.guardar('pendiente');
  }

  private guardar(estado: string): void {
    if (this.form.invalid) {
      return;
    }
    this.guardando = true;
    const payload = this.buildPayload(estado);
    const op = this.modoEdicion && this.ordenId
      ? this.comprasService.actualizarOrden(this.ordenId, payload)
      : this.comprasService.crearOrden(payload);

    op.subscribe({
      next: (orden) => {
        this.guardando = false;
        this.router.navigate(['/compras', orden.id]);
      },
      error: (err) => {
        this.guardando = false;
        alert(err.error?.error || 'Error al guardar la orden');
      }
    });
  }

  private cargarOrden(id: number): void {
    this.comprasService.getOrden(id).subscribe({
      next: (orden) => {
        this.ordenNumero = orden.numero || '';
        const prov = orden.proveedor != null && typeof orden.proveedor === 'object'
          ? (orden.proveedor as Proveedor).id
          : orden.proveedor;
        let almacenVal: number | null = orden.almacen != null && typeof orden.almacen === 'object'
          ? (orden.almacen as { id: number }).id
          : (orden.almacen as number | null) ?? null;
        if (!almacenVal && orden.items?.length) {
          const first = orden.items[0];
          almacenVal = first.almacen != null && typeof first.almacen === 'object'
            ? (first.almacen as { id: number }).id
            : (first.almacen as number | null) ?? null;
        }
        this.form.patchValue({
          proveedor: prov ?? null,
          fecha: orden.fecha,
          factura_compra: orden.factura_compra || '',
          almacen: almacenVal,
        });
        this.items = (orden.items || []).map(i => {
          const cantidad = this.toNum(i.cantidad, 1);
          const precio = this.toNum(i.precio_unitario, 0);
          const dist = (i.distribuciones || []).map(d => ({
            ...d,
            cantidad: this.toNum(d.cantidad, 0),
          }));
          return {
            ...i,
            cantidad,
            costo_mercaderia: this.toNum(i.costo_mercaderia, 0),
            flete_unitario: this.toNum(i.flete_unitario, 0),
            porcentaje_ganancia: this.toNum(i.porcentaje_ganancia, 0),
            precio_unitario: precio,
            precio_venta_sugerido: this.toNum(i.precio_venta_sugerido, 0),
            precio_venta_es_manual: !!(i as OrdenCompraItem).precio_venta_es_manual,
            distribuciones: dist.length ? dist : undefined,
            subtotal: cantidad * precio,
          };
        });
        this.cdr.markForCheck();
      }
    });
  }

  onVolver(): void { this.router.navigate(['/compras']); }

  onIrProveedores(): void {
    this.router.navigate(['/compras/proveedores']);
  }
}
