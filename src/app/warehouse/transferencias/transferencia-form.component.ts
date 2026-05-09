import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  WarehouseExtraService, TransferenciaItem
} from '../services/warehouse-extra.service';

@Component({
  selector: 'app-transferencia-form',
  templateUrl: './transferencia-form.component.html',
  styleUrls: ['./transferencia-form.component.scss']
})
export class TransferenciaFormComponent implements OnInit {

  form!: FormGroup;
  itemForm!: FormGroup;
  items: TransferenciaItem[] = [];
  almacenes: any[] = [];
  productosFiltrados: any[] = [];
  productoSeleccionado: any = null;
  variantesDisponibles: any[] = [];
  guardando = false;
  private busqueda$ = new Subject<string>();

  columnas = ['producto', 'variante', 'cantidad', 'eliminar'];

  constructor(
    private fb: FormBuilder,
    private svc: WarehouseExtraService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.svc.getAlmacenes().subscribe(a => {
      this.almacenes = a;
      this.cdr.markForCheck();
    });
    this.busqueda$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(q => {
      if ((q || '').length < 2) {
        this.productosFiltrados = [];
        this.cdr.markForCheck();
        return;
      }
      this.svc.buscarProductos(q).subscribe(p => {
        this.productosFiltrados = p;
        this.cdr.markForCheck();
      });
    });
  }

  private initForms(): void {
    this.form = this.fb.group({
      almacen_origen: [null, Validators.required],
      almacen_destino: [null, Validators.required],
      notas: [''],
    });
    this.itemForm = this.fb.group({
      busqueda: [''],
      variante: [null],
      cantidad: [1, [Validators.required, Validators.min(1)]],
    });
  }

  onBusqueda(v: string): void {
    this.busqueda$.next(v || '');
  }

  onSeleccionarProducto(p: any): void {
    this.productoSeleccionado = p;
    this.variantesDisponibles = p.variantes || [];
    this.itemForm.patchValue({
      busqueda: p.name, variante: null });
    this.productosFiltrados = [];
    this.cdr.markForCheck();
  }

  onAgregarItem(): void {
    if (!this.productoSeleccionado || this.itemForm.invalid) {
      return;
    }
    const v = this.itemForm.value;
    const varDet = v.variante
      ? this.variantesDisponibles.find(
          (vr: any) => vr.id === v.variante) || null
      : null;
    this.items = [...this.items, {
      producto: this.productoSeleccionado.id,
      producto_nombre: this.productoSeleccionado.name,
      variante: v.variante || null,
      variante_detalle: varDet,
      cantidad: v.cantidad,
    }];
    this.productoSeleccionado = null;
    this.variantesDisponibles = [];
    this.itemForm.reset({
      busqueda: '', variante: null,
      cantidad: 1
    });
    this.cdr.markForCheck();
  }

  onEliminar(i: number): void {
    this.items = this.items.filter((_, idx) => idx !== i);
  }

  onGuardar(): void {
    if (this.form.invalid) { return; }
    if (this.items.length === 0) {
      alert('Agrega al menos un producto'); return;
    }
    const o = this.form.value.almacen_origen;
    const d = this.form.value.almacen_destino;
    if (o === d) {
      alert('El origen y destino deben ser diferentes');
      return;
    }
    this.guardando = true;
    const payload = {
      ...this.form.value,
      items: this.items.map(i => ({
        producto: i.producto,
        variante: i.variante || null,
        cantidad: i.cantidad,
      }))
    };
    this.svc.crearTransferencia(payload).subscribe({
      next: (t) => {
        this.guardando = false;
        this.router.navigate(['/almacen/transferencias', t.id]);
      },
      error: (err) => {
        this.guardando = false;
        alert(err.error?.error || err.error?.detail || 'Error al crear transferencia');
      }
    });
  }

  onVolver(): void {
    this.router.navigate(['/almacen/transferencias']);
  }
}
