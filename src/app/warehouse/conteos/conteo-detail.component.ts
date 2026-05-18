import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import {
  WarehouseExtraService, ConteoFisico
} from '../services/warehouse-extra.service';
import { PermisosService } from '../../core/services/permisos.service';

@Component({
  selector: 'app-conteo-detail',
  templateUrl: './conteo-detail.component.html',
  styleUrls: ['./conteo-detail.component.scss']
})
export class ConteoDetailComponent implements OnInit {

  conteo: ConteoFisico | null = null;
  cargando = true;
  guardandoItem = false;

  productosFiltrados: any[] = [];
  productoSeleccionado: any = null;
  variantesDisponibles: any[] = [];
  stockSistema: number | null = null;
  stockPorVariante: Record<number, number | null> = {};
  cargandoStock = false;
  stockFisico = 0;
  notaItem = '';
  varianteSeleccionada: number | null = null;

  columnas = ['producto', 'variante', 'sistema',
    'fisico', 'diferencia', 'notas'];

  private busqueda$ = new Subject<string>();

  constructor(
    private svc: WarehouseExtraService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public permisosService: PermisosService,
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.params['id'];
    if (!id) {
      this.router.navigate(['/almacen/conteos']);
      return;
    }
    this.cargar(id);
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

  cargar(id: number): void {
    this.svc.getConteo(id).subscribe({
      next: (c) => {
        this.conteo = c;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => this.router.navigate(['/almacen/conteos'])
    });
  }

  onBusqueda(v: string): void {
    this.busqueda$.next(v || '');
  }

  onSeleccionarProducto(p: any): void {
    this.productoSeleccionado = p;
    this.variantesDisponibles = p.variantes || [];
    this.varianteSeleccionada = null;
    this.productosFiltrados = [];
    this.stockSistema = null;
    this.stockPorVariante = {};

    if (!this.conteo?.almacen) {
      this.cdr.markForCheck();
      return;
    }

    if (this.variantesDisponibles.length > 0) {
      this.cargandoStock = true;
      const calls = this.variantesDisponibles.map((v: any) =>
        this.svc.getStockEnAlmacen(p.id, this.conteo!.almacen, v.id).pipe(
          catchError(() => of(null)),
        ),
      );
      forkJoin(calls).subscribe((stocks) => {
        this.variantesDisponibles.forEach((v: any, i: number) => {
          this.stockPorVariante[v.id] = stocks[i];
        });
        this.cargandoStock = false;
        this.cdr.markForCheck();
      });
    } else {
      this.actualizarStockSistema();
    }
    this.cdr.markForCheck();
  }

  onVarianteChange(): void {
    if (!this.varianteSeleccionada) {
      this.stockSistema = null;
      this.cdr.markForCheck();
      return;
    }
    const cached = this.stockPorVariante[this.varianteSeleccionada];
    if (cached !== undefined) {
      this.stockSistema = cached;
      this.cdr.markForCheck();
      return;
    }
    this.actualizarStockSistema();
  }

  stockVarianteLabel(varianteId: number): string {
    const v = this.stockPorVariante[varianteId];
    if (v === null || v === undefined) {
      return '...';
    }
    return String(v);
  }

  etiquetaStockSistema(): string {
    if (this.cargandoStock) {
      return '...';
    }
    if (this.stockSistema === null) {
      if (this.variantesDisponibles.length > 0 && !this.varianteSeleccionada) {
        return '—';
      }
      return 'No disponible';
    }
    return String(this.stockSistema);
  }

  private actualizarStockSistema(): void {
    if (!this.productoSeleccionado || !this.conteo?.almacen) {
      this.stockSistema = null;
      return;
    }
    if (this.variantesDisponibles.length > 0 && !this.varianteSeleccionada) {
      this.stockSistema = null;
      return;
    }
    this.cargandoStock = true;
    this.svc.getStockEnAlmacen(
      this.productoSeleccionado.id,
      this.conteo.almacen,
      this.varianteSeleccionada,
    ).subscribe({
      next: (qty) => {
        this.stockSistema = qty;
        if (this.varianteSeleccionada) {
          this.stockPorVariante[this.varianteSeleccionada] = qty;
        }
        this.cargandoStock = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.stockSistema = null;
        if (this.varianteSeleccionada) {
          this.stockPorVariante[this.varianteSeleccionada] = null;
        }
        this.cargandoStock = false;
        this.cdr.markForCheck();
      },
    });
  }

  onAgregarItem(): void {
    if (!this.productoSeleccionado || !this.conteo || this.conteo.estado !== 'abierto') {
      return;
    }
    this.guardandoItem = true;
    const conteoId = this.conteo.id!;
    this.svc.agregarItem(conteoId, {
      producto: this.productoSeleccionado.id,
      variante: this.varianteSeleccionada || undefined,
      stock_fisico: this.stockFisico,
      notas: this.notaItem,
    }).subscribe({
      next: () => {
        this.productoSeleccionado = null;
        this.variantesDisponibles = [];
        this.varianteSeleccionada = null;
        this.stockSistema = null;
        this.stockPorVariante = {};
        this.stockFisico = 0;
        this.notaItem = '';
        this.guardandoItem = false;
        this.cargar(conteoId);
      },
      error: (err) => {
        this.guardandoItem = false;
        alert(err.error?.error || err.error?.detail || 'Error al agregar ítem');
      }
    });
  }

  onCerrar(): void {
    if (!confirm(
      '¿Cerrar el conteo? Ya no podrá registrar ítems; quedará pendiente de revisión.'
    )) { return; }
    this.svc.cerrarConteo(this.conteo!.id!).subscribe({
      next: (c) => {
        this.conteo = c;
        this.cdr.markForCheck();
      },
      error: (err) => alert(err.error?.error || 'Error al cerrar')
    });
  }

  itemsPendientesVariante(): any[] {
    if (!this.conteo?.items?.length) return [];
    return this.conteo.items.filter(
      (i: any) => i.producto_requiere_variante && !i.variante_detalle,
    );
  }

  onVolver(): void {
    this.router.navigate(['/almacen/conteos']);
  }

  getDifColor(dif: number | undefined): string {
    if (!dif && dif !== 0) return '';
    if (dif > 0) return 'sobrante';
    if (dif < 0) return 'faltante';
    return '';
  }

  puedeRegistrarItems(): boolean {
    return this.permisosService.puede('inventario', 'operar');
  }

  puedeCerrar(): boolean {
    return this.puedeRegistrarItems();
  }

  formularioHabilitado(): boolean {
    return this.conteo?.estado === 'abierto' && this.puedeRegistrarItems();
  }

  mostrarFormularioConteo(): boolean {
    if (!this.conteo) return false;
    return this.conteo.estado === 'abierto' || this.conteo.estado === 'cerrado';
  }
}
