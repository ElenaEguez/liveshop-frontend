import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  WarehouseExtraService, ConteoFisico
} from '../services/warehouse-extra.service';
import { PermisosService } from '../../core/services/permisos.service';
import { PermissionsService } from '../../shared/permissions.service';

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
    private permissions: PermissionsService,
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
    this.cdr.markForCheck();
  }

  onAgregarItem(): void {
    if (!this.productoSeleccionado || !this.conteo) { return; }
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
      '¿Cerrar el conteo? '
      + 'Las empleadas ya no podrán registrar ítems; la dueña o almacén '
      + 'sí podrá corregir cantidades mientras esté cerrado y antes de aprobar.'
    )) { return; }
    this.svc.cerrarConteo(this.conteo!.id!).subscribe({
      next: (c) => {
        this.conteo = c;
        this.cdr.markForCheck();
      },
      error: (err) => alert(err.error?.error || 'Error al cerrar')
    });
  }

  onAprobar(): void {
    const difs = this.conteo?.items_con_diferencia || 0;
    if (!confirm(
      `¿Aprobar conteo? Se ajustarán ${difs} ítems con diferencia. `
      + 'Esta acción no se puede deshacer.')) { return; }
    this.svc.aprobarConteo(this.conteo!.id!).subscribe({
      next: (res: any) => {
        const { items_ajustados: adj, ...rest } = res;
        this.conteo = rest as ConteoFisico;
        this.cdr.markForCheck();
        alert(
          `Conteo aprobado. ${adj || 0} ajustes aplicados.`);
      },
      error: (err) => alert(err.error?.error || 'Error al aprobar')
    });
  }

  onCancelar(): void {
    if (!confirm('¿Cancelar este conteo?')) { return; }
    this.svc.cancelarConteo(this.conteo!.id!).subscribe({
      next: (c) => {
        this.conteo = c;
        this.cdr.markForCheck();
      },
      error: (err) => alert(err.error?.error || 'Error al cancelar')
    });
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

  /** Encargado con permiso inventario (o propietario vía puede()). */
  puedeRegistrarItems(): boolean {
    return this.permisosService.puede('inventario', 'operar');
  }

  puedeAprobar(): boolean {
    const p = this.permisosService.permisos;
    if (p?.es_propietario || p?.rol === 'superadmin') return true;
    if (this.permisosService.puede('almacen', 'operar')) return true;
    return this.permissions.canUseWarehouse();
  }

  puedeCerrar(): boolean {
    return this.puedeRegistrarItems()
      || this.puedeAprobar();
  }

  puedeCancelar(): boolean {
    return this.puedeAprobar();
  }

  /** Dueña / almacén: corregir cantidades físicas en conteo cerrado (antes de aprobar). */
  puedeCorregirConteoCerrado(): boolean {
    return this.puedeAprobar();
  }

  puedeMostrarFormularioConteo(): boolean {
    if (!this.conteo) {
      return false;
    }
    if (this.conteo.estado === 'abierto' && this.puedeRegistrarItems()) {
      return true;
    }
    return this.conteo.estado === 'cerrado' && this.puedeCorregirConteoCerrado();
  }
}
