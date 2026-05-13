import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
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
  cargando = true;
  columnas = ['almacen', 'fecha', 'estado',
    'diferencias', 'acciones'];

  constructor(
    private svc: WarehouseExtraService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public permisosService: PermisosService,
    private permissions: PermissionsService,
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.svc.getConteos().subscribe({
      next: (data) => {
        this.conteos = data;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
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
