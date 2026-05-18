import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import {
  WarehouseExtraService, ConteoFisico
} from '../services/warehouse-extra.service';
import { PermisosService } from '../../core/services/permisos.service';
import { PermissionsService } from '../../shared/permissions.service';

@Component({
  selector: 'app-conteos-list',
  templateUrl: './conteos-list.component.html',
  styleUrls: ['./conteos-list.component.scss']
})
export class ConteosListComponent implements OnInit {

  conteos: ConteoFisico[] = [];
  almacenes: Array<{ id: number; nombre: string }> = [];
  cargando = true;
  columnas = ['almacen', 'fecha', 'estado',
    'diferencias', 'acciones'];

  filtroAlmacenId: number | null = null;
  fechaDesde = '';
  fechaHasta = '';
  currentPage = 1;
  totalItems = 0;
  pageSize = 20;

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
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    const params: {
      page: number;
      page_size: number;
      almacen_id?: number;
      fecha_desde?: string;
      fecha_hasta?: string;
    } = {
      page: this.currentPage,
      page_size: this.pageSize,
    };
    if (this.filtroAlmacenId != null) {
      params.almacen_id = this.filtroAlmacenId;
    }
    if (this.fechaDesde) {
      params.fecha_desde = this.fechaDesde;
    }
    if (this.fechaHasta) {
      params.fecha_hasta = this.fechaHasta;
    }
    this.svc.getConteos(params).subscribe({
      next: (data) => {
        this.conteos = data?.results ?? [];
        this.totalItems = data?.count ?? 0;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  onFiltrosChange(): void {
    this.currentPage = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroAlmacenId = null;
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.currentPage = 1;
    this.cargar();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.cargar();
  }

  onNuevo(): void {
    this.router.navigate(['/almacen/conteos/nuevo']);
  }

  onVer(id: number): void {
    this.router.navigate(['/almacen/conteos', id]);
  }

  puedeControlSupervision(): boolean {
    const p = this.permisosService.permisos;
    if (p?.es_propietario || p?.rol === 'superadmin') return true;
    if (this.permisosService.puede('almacen', 'operar')) return true;
    return this.permissions.canUseWarehouse();
  }

  onControlSupervision(): void {
    this.router.navigate(['/almacen/conteos-control']);
  }

  getColor(estado: string | undefined): string {
    const m: Record<string, string> = {
      abierto: 'accent',
      cerrado: 'primary',
      aprobado: 'primary',
      cancelado: 'warn'
    };
    return m[estado || ''] || 'primary';
  }
}
