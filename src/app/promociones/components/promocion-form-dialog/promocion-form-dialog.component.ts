import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { Category, CategoryService } from '../../../categories/services/category.service';
import { Product, ProductService } from '../../../products/products.service';
import {
  Promocion,
  PromocionesService,
  VistaPrevia,
} from '../../promociones.service';

@Component({
  selector: 'app-promocion-form-dialog',
  templateUrl: './promocion-form-dialog.component.html',
  styleUrls: ['./promocion-form-dialog.component.scss'],
})
export class PromocionFormDialogComponent implements OnInit {
  form!: FormGroup;
  isEdit: boolean;
  guardando = false;
  error = '';

  categorias: Category[] = [];
  productosSeleccionados: { id: number; nombre: string; sku: string | null; precio: string }[] = [];

  busquedaProducto = '';
  resultadosBusqueda: Product[] = [];
  buscando = false;
  private busqueda$ = new Subject<string>();

  vistaPrevia: VistaPrevia | null = null;
  cargandoVistaPrevia = false;

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: { promocion: Promocion | null },
    private dialogRef: MatDialogRef<PromocionFormDialogComponent>,
    private svc: PromocionesService,
    private categoryService: CategoryService,
    private productService: ProductService,
  ) {
    this.isEdit = !!data?.promocion;
  }

  ngOnInit(): void {
    const promo = this.data?.promocion;
    this.form = this.fb.group({
      nombre: [promo?.nombre || '', Validators.required],
      tipo: [promo?.tipo || 'porcentaje', Validators.required],
      valor: [promo?.valor ? +promo.valor : null, [Validators.required, Validators.min(0.01)]],
      categorias: [promo?.categorias || []],
      aplica_web: [promo?.aplica_web ?? true],
      aplica_pos: [false],
      aplica_live: [false],
      fecha_inicio: [promo?.fecha_inicio || null],
      fecha_fin: [promo?.fecha_fin || null],
      activa: [promo?.activa ?? true],
    });

    this.productosSeleccionados = (promo?.productos_detalle || []).map(p => ({
      id: p.id, nombre: p.nombre, sku: p.sku, precio: p.precio,
    }));

    this.categoryService.getAllCategories().subscribe({
      next: cats => (this.categorias = cats),
      error: () => {},
    });

    this.busqueda$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q || q.trim().length < 2) {
          this.buscando = false;
          return [];
        }
        this.buscando = true;
        return this.productService.getProducts(1, q.trim());
      }),
    ).subscribe({
      next: res => {
        this.buscando = false;
        this.resultadosBusqueda = (res?.results || []).filter(
          p => !this.productosSeleccionados.some(sel => sel.id === p.id),
        );
      },
      error: () => { this.buscando = false; },
    });
  }

  onBusquedaChange(valor: string): void {
    this.busquedaProducto = valor;
    this.busqueda$.next(valor);
  }

  agregarProducto(p: Product): void {
    if (!p.id || this.productosSeleccionados.some(sel => sel.id === p.id)) return;
    this.productosSeleccionados.push({
      id: p.id, nombre: p.name, sku: p.internal_code || null, precio: String(p.price),
    });
    this.resultadosBusqueda = this.resultadosBusqueda.filter(r => r.id !== p.id);
    this.vistaPrevia = null;
  }

  quitarProducto(id: number): void {
    this.productosSeleccionados = this.productosSeleccionados.filter(p => p.id !== id);
    this.vistaPrevia = null;
  }

  verVistaPrevia(): void {
    if (this.form.get('tipo')?.invalid || this.form.get('valor')?.invalid) return;
    const productos = this.productosSeleccionados.map(p => p.id);
    const categorias = this.form.get('categorias')?.value || [];
    if (!productos.length && !categorias.length) {
      this.error = 'Elija al menos un producto o una categoría para ver la vista previa.';
      return;
    }
    this.error = '';
    this.cargandoVistaPrevia = true;
    this.svc.vistaPrevia({
      tipo: this.form.get('tipo')?.value,
      valor: this.form.get('valor')?.value,
      productos,
      categorias,
    }).subscribe({
      next: vp => { this.vistaPrevia = vp; this.cargandoVistaPrevia = false; },
      error: () => { this.cargandoVistaPrevia = false; },
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando) return;
    const productos = this.productosSeleccionados.map(p => p.id);
    const categorias = this.form.get('categorias')?.value || [];
    if (!productos.length && !categorias.length) {
      this.error = 'Elija al menos un producto o una categoría.';
      return;
    }
    const { aplica_web, aplica_pos, aplica_live } = this.form.value;
    if (!aplica_web && !aplica_pos && !aplica_live) {
      this.error = 'Habilite al menos un canal.';
      return;
    }

    this.guardando = true;
    this.error = '';
    const payload = { ...this.form.value, productos, categorias };
    const obs = this.isEdit
      ? this.svc.updatePromocion(this.data.promocion!.id, payload)
      : this.svc.createPromocion(payload);

    obs.subscribe({
      next: promo => this.dialogRef.close(promo),
      error: err => {
        this.guardando = false;
        this.error = err.error?.[0] || err.error?.valor?.[0] || err.error?.detail
          || 'No se pudo guardar la promoción.';
      },
    });
  }
}
