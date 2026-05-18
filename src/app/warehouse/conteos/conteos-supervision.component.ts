import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { Router } from '@angular/router';

import { PageEvent } from '@angular/material/paginator';

import {

  WarehouseExtraService,

  ConteoFisico,

  ConteoItem,

} from '../services/warehouse-extra.service';

import { PermisosService } from '../../core/services/permisos.service';

import { PermissionsService } from '../../shared/permissions.service';



@Component({

  selector: 'app-conteos-supervision',

  templateUrl: './conteos-supervision.component.html',

  styleUrls: ['./conteos-supervision.component.scss'],

})

export class ConteosSupervisionComponent implements OnInit {

  tabIndex = 0;



  conteosPendientes: ConteoFisico[] = [];

  conteosHistorial: ConteoFisico[] = [];

  almacenes: Array<{ id: number; nombre: string }> = [];



  conteoRevisando: ConteoFisico | null = null;

  cargandoDetalle = false;

  itemEditandoId: number | null = null;

  editStockFisico = 0;

  editNotas = '';

  guardandoItem = false;



  cargandoPendientes = true;

  cargandoHistorial = false;



  filtroAlmacenId: number | null = null;



  columnasPendientes = [

    'almacen', 'creado', 'fecha', 'creador', 'items', 'diferencias', 'acciones',

  ];

  columnasHistorial = [

    'almacen', 'fecha', 'estado', 'creador', 'aprobado', 'items', 'diferencias',

  ];

  columnasItems = [

    'producto', 'variante', 'sistema', 'fisico', 'diferencia', 'notas', 'acciones_item',

  ];



  pagePendientes = 1;

  totalPendientes = 0;

  pageSizePendientes = 20;



  pageHistorial = 1;

  totalHistorial = 0;

  pageSizeHistorial = 20;



  procesandoId: number | null = null;



  constructor(

    private svc: WarehouseExtraService,

    private router: Router,

    private cdr: ChangeDetectorRef,

    public permisosService: PermisosService,

    private permissions: PermissionsService,

  ) {}



  ngOnInit(): void {

    this.svc.getAlmacenes().subscribe({

      next: (list) => {

        this.almacenes = (list || []).map((a: any) => ({

          id: a.id,

          nombre: a.nombre || `Almacén ${a.id}`,

        }));

        this.cdr.markForCheck();

      },

      error: () => {},

    });

    this.cargarPendientes();

  }



  onTabChange(index: number): void {

    this.tabIndex = index;

    this.cerrarRevision();

    if (index === 1) {

      this.cargarHistorial();

    }

  }



  onFiltroAlmacenChange(): void {

    this.pagePendientes = 1;

    this.pageHistorial = 1;

    this.cerrarRevision();

    this.cargarPendientes();

    if (this.tabIndex === 1) {

      this.cargarHistorial();

    }

  }



  private buildParams(page: number, pageSize: number, estado: string) {

    const params: {

      page: number;

      page_size: number;

      estado: string;

      almacen_id?: number;

    } = { page, page_size: pageSize, estado };

    if (this.filtroAlmacenId != null) {

      params.almacen_id = this.filtroAlmacenId;

    }

    return params;

  }



  cargarPendientes(): void {

    this.cargandoPendientes = true;

    this.svc.getConteos(this.buildParams(this.pagePendientes, this.pageSizePendientes, 'cerrado'))

      .subscribe({

        next: (data) => {

          this.conteosPendientes = data?.results ?? [];

          this.totalPendientes = data?.count ?? 0;

          this.cargandoPendientes = false;

          this.cdr.markForCheck();

        },

        error: () => {

          this.conteosPendientes = [];

          this.totalPendientes = 0;

          this.cargandoPendientes = false;

          this.cdr.markForCheck();

        },

      });

  }



  cargarHistorial(): void {

    this.cargandoHistorial = true;

    this.svc.getConteos(

      this.buildParams(this.pageHistorial, this.pageSizeHistorial, 'aprobado,cancelado'),

    ).subscribe({

      next: (data) => {

        this.conteosHistorial = data?.results ?? [];

        this.totalHistorial = data?.count ?? 0;

        this.cargandoHistorial = false;

        this.cdr.markForCheck();

      },

      error: () => {

        this.conteosHistorial = [];

        this.totalHistorial = 0;

        this.cargandoHistorial = false;

        this.cdr.markForCheck();

      },

    });

  }



  onPagePendientes(event: PageEvent): void {

    this.pagePendientes = event.pageIndex + 1;

    this.pageSizePendientes = event.pageSize;

    this.cargarPendientes();

  }



  onPageHistorial(event: PageEvent): void {

    this.pageHistorial = event.pageIndex + 1;

    this.pageSizeHistorial = event.pageSize;

    this.cargarHistorial();

  }



  puedeOperar(): boolean {

    const p = this.permisosService.permisos;

    if (p?.es_propietario || p?.rol === 'superadmin') return true;

    if (this.permisosService.puede('almacen', 'operar')) return true;

    return this.permissions.canUseWarehouse();

  }



  puedeAprobar(): boolean {

    const p = this.permisosService.permisos;

    return !!(p?.es_propietario || p?.rol === 'superadmin');

  }



  puedeEditarItems(): boolean {

    return this.puedeOperar();

  }



  itemsPendientesVariante(c: ConteoFisico): number {

    if (!c.items?.length) return 0;

    return c.items.filter(

      (i: any) => i.producto_requiere_variante && !i.variante_detalle,

    ).length;

  }

  revisionSoloLectura(): boolean {
    return this.conteoRevisando?.estado !== 'cerrado';
  }

  onRevisar(c: ConteoFisico): void {

    if (!c.id) return;

    this.cargandoDetalle = true;

    this.itemEditandoId = null;

    this.svc.getConteo(c.id).subscribe({

      next: (full) => {

        this.conteoRevisando = full;

        this.cargandoDetalle = false;

        this.cdr.markForCheck();

      },

      error: () => {

        this.cargandoDetalle = false;

        alert('No se pudo cargar el detalle del conteo.');

        this.cdr.markForCheck();

      },

    });

  }



  cerrarRevision(): void {

    this.conteoRevisando = null;

    this.itemEditandoId = null;

  }



  onEditarItem(item: ConteoItem): void {

    if (!item.id) return;

    this.itemEditandoId = item.id;

    this.editStockFisico = item.stock_fisico ?? 0;

    this.editNotas = item.notas || '';

  }



  onCancelarEdicionItem(): void {

    this.itemEditandoId = null;

  }



  onGuardarItem(item: ConteoItem): void {

    if (!this.conteoRevisando?.id || !item.id) return;

    this.guardandoItem = true;

    this.svc.editarItemConteo(this.conteoRevisando.id, item.id, {

      stock_fisico: this.editStockFisico,

      notas: this.editNotas,

    }).subscribe({

      next: () => {

        this.guardandoItem = false;

        this.itemEditandoId = null;

        this.onRevisar(this.conteoRevisando!);

        this.cargarPendientes();

      },

      error: (err) => {

        this.guardandoItem = false;

        alert(err.error?.error || 'Error al guardar ítem');

        this.cdr.markForCheck();

      },

    });

  }



  getDifColor(dif: number | undefined): string {

    if (dif === undefined || dif === null) return '';

    if (dif > 0) return 'sobrante';

    if (dif < 0) return 'faltante';

    return '';

  }



  onAprobar(c: ConteoFisico, event?: Event): void {

    event?.stopPropagation();

    if (!c.id || !this.puedeAprobar()) return;

    if (this.itemsPendientesVariante(c) > 0) {

      alert('Hay ítems sin variante. Complete talla/color antes de aprobar.');

      return;

    }

    const difs = c.items_con_diferencia || 0;

    if (!confirm(

      `¿Aprobar conteo de ${c.almacen_nombre}? `

      + `Se ajustarán ${difs} ítems con diferencia.`)) {

      return;

    }

    this.procesandoId = c.id;

    this.svc.aprobarConteo(c.id).subscribe({

      next: () => {

        this.procesandoId = null;

        this.cerrarRevision();

        alert('Conteo aprobado. Ajustes de inventario aplicados.');

        this.cargarPendientes();

        if (this.tabIndex === 1) {

          this.cargarHistorial();

        }

        this.cdr.markForCheck();

      },

      error: (err) => {

        this.procesandoId = null;

        alert(err.error?.error || 'Error al aprobar');

        this.cdr.markForCheck();

      },

    });

  }



  onCancelar(c: ConteoFisico, event?: Event): void {

    event?.stopPropagation();

    if (!c.id || !this.puedeOperar()) return;

    if (!confirm(`¿Cancelar el conteo de ${c.almacen_nombre}?`)) return;

    this.procesandoId = c.id;

    this.svc.cancelarConteo(c.id).subscribe({

      next: () => {

        this.procesandoId = null;

        this.cerrarRevision();

        this.cargarPendientes();

        if (this.tabIndex === 1) {

          this.cargarHistorial();

        }

        this.cdr.markForCheck();

      },

      error: (err) => {

        this.procesandoId = null;

        alert(err.error?.error || 'Error al cancelar');

        this.cdr.markForCheck();

      },

    });

  }



  onVolverListaConteos(): void {

    this.router.navigate(['/almacen/conteos']);

  }

}


