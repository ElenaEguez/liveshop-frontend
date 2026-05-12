import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import {
  ComprasService, OrdenCompra, OrdenCompraItem,
  Proveedor, ProductoLookup, VarianteDetalle
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
    });

    this.itemForm = this.fb.group({
      busqueda: [''],
      variante: [null],
      almacen: [null, Validators.required],
      descripcion: [''],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      costo_mercaderia: [0, [Validators.required, Validators.min(0)]],
      flete_unitario: [0, [Validators.min(0)]],
      costo_unitario_total: [{ value: 0, disabled: true }],
      porcentaje_ganancia: [50, [Validators.min(0)]],
      precio_venta_sugerido: [{ value: 0, disabled: true }],
      precio_unitario: [0, [Validators.required, Validators.min(0)]],
    });
  }

  private configurarCalculos(): void {
    const f = this.itemForm;
    const recalcular = () => {
      const costo = +(f.get('costo_mercaderia')?.value || 0);
      const flete = +(f.get('flete_unitario')?.value || 0);
      const pct = +(f.get('porcentaje_ganancia')?.value || 0);
      const total = costo + flete;
      const pventa = pct > 0 ? +(total * (1 + pct / 100)).toFixed(2) : total;
      f.get('costo_unitario_total')?.setValue(total, { emitEvent: false });
      f.get('precio_venta_sugerido')?.setValue(pventa, { emitEvent: false });
      if (!f.get('precio_unitario')?.value) {
        f.get('precio_unitario')?.setValue(total, { emitEvent: false });
      }
    };
    ['costo_mercaderia', 'flete_unitario', 'porcentaje_ganancia']
      .forEach(c => f.get(c)?.valueChanges.subscribe(() => recalcular()));
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
      if (query.length < 2) {
        this.productosFiltrados = [];
        this.cdr.markForCheck();
        return;
      }
      this.comprasService.buscarProductos(query).subscribe(p => {
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
    this.itemForm.patchValue({
      busqueda: producto.name,
      costo_mercaderia: 0,
      precio_unitario: 0,
      variante: null,
    });
    this.productosFiltrados = [];
    this.cdr.markForCheck();
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
    if (this.itemForm.invalid) return;

    const v = this.itemForm.getRawValue();
    const nuevoItem: OrdenCompraItem = {
      producto: this.productoSeleccionado.id,
      producto_nombre: this.productoSeleccionado.name,
      variante: v.variante || null,
      variante_detalle: v.variante
        ? this.variantesDisponibles.find(vr => vr.id === v.variante) || null
        : null,
      almacen: v.almacen || null,
      descripcion: v.descripcion,
      cantidad: v.cantidad,
      costo_mercaderia: v.costo_mercaderia,
      flete_unitario: v.flete_unitario,
      costo_unitario_total: v.costo_unitario_total,
      porcentaje_ganancia: v.porcentaje_ganancia,
      precio_venta_sugerido: v.precio_venta_sugerido,
      precio_unitario: v.precio_unitario,
      subtotal: v.cantidad * v.precio_unitario,
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
    this.itemForm.reset({
      busqueda: '', variante: null, almacen: null,
      descripcion: '', cantidad: 1,
      costo_mercaderia: 0, flete_unitario: 0,
      porcentaje_ganancia: 50, precio_unitario: 0,
    });
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
    if (!id) return 'Cabecera';
    const a = this.almacenes.find((x: any) => x.id === id);
    return a?.nombre || String(id);
  }

  private toNum(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private buildPayload(estado: string): Partial<OrdenCompra> {
    return {
      ...this.form.value,
      sucursal: null,
      almacen: null,
      fecha_entrega: null,
      notas: '',
      descuento: 0,
      estado: estado as any,
      items: this.items.map(i => ({
        producto: i.producto,
        variante: i.variante || null,
        almacen: i.almacen || null,
        descripcion: i.descripcion || '',
        cantidad: this.toNum(i.cantidad, 1),
        costo_mercaderia: this.toNum(i.costo_mercaderia, 0),
        flete_unitario: this.toNum(i.flete_unitario, 0),
        porcentaje_ganancia: this.toNum(i.porcentaje_ganancia, 0),
        precio_unitario: this.toNum(i.precio_unitario, 0),
      })),
    };
  }

  onGuardarBorrador(): void { this.guardar('borrador'); }

  onEnviarPendiente(): void {
    if (this.items.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }
    this.guardar('pendiente');
  }

  private guardar(estado: string): void {
    if (this.form.invalid) return;
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
        this.form.patchValue({
          proveedor: prov ?? null,
          fecha: orden.fecha,
          factura_compra: orden.factura_compra || '',
        });
        this.items = (orden.items || []).map(i => {
          const cantidad = this.toNum(i.cantidad, 1);
          const precio = this.toNum(i.precio_unitario, 0);
          return {
            ...i,
            cantidad,
            costo_mercaderia: this.toNum(i.costo_mercaderia, 0),
            flete_unitario: this.toNum(i.flete_unitario, 0),
            porcentaje_ganancia: this.toNum(i.porcentaje_ganancia, 0),
            precio_unitario: precio,
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
