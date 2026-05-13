import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { WarehouseExtraService, ConteoFisico } from '../services/warehouse-extra.service';
import { PermisosService } from '../../core/services/permisos.service';
import { PermissionsService } from '../../shared/permissions.service';

@Component({
  selector: 'app-conteos-supervision',
  templateUrl: './conteos-supervision.component.html',
  styleUrls: ['./conteos-supervision.component.scss'],
})
export class ConteosSupervisionComponent implements OnInit {
  conteos: ConteoFisico[] = [];
  cargando = true;
  columnas = ['almacen', 'fecha', 'creador', 'items', 'diferencias', 'acciones'];

  constructor(
    private svc: WarehouseExtraService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public permisosService: PermisosService,
    private permissions: PermissionsService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  /** Aprobar / cancelar requiere permiso de almacén (API + menú). */
  puedeOperar(): boolean {
    const p = this.permisosService.permisos;
    if (p?.es_propietario || p?.rol === 'superadmin') return true;
    if (this.permisosService.puede('almacen', 'operar')) return true;
    return this.permissions.canUseWarehouse();
  }

  cargar(): void {
    this.cargando = true;
    this.svc.getConteos({ estado: 'cerrado' }).subscribe({
      next: (data) => {
        this.conteos = data;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.conteos = [];
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  onRevisar(id: number): void {
    this.router.navigate(['/almacen/conteos', id]);
  }

  onVolverListaConteos(): void {
    this.router.navigate(['/almacen/conteos']);
  }
}
