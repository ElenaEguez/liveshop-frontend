import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import {
  WarehouseExtraService, Transferencia
} from '../services/warehouse-extra.service';

@Component({
  selector: 'app-transferencias-list',
  templateUrl: './transferencias-list.component.html',
  styleUrls: ['./transferencias-list.component.scss']
})
export class TransferenciasListComponent implements OnInit {

  transferencias: Transferencia[] = [];
  cargando = true;
  columnas = ['origen', 'destino', 'estado',
    'items', 'fecha', 'acciones'];

  constructor(
    private svc: WarehouseExtraService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.svc.getTransferencias().subscribe({
      next: (data) => {
        this.transferencias = data;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  onNueva(): void {
    this.router.navigate(['/almacen/transferencias/nueva']);
  }

  onVer(id: number): void {
    this.router.navigate(['/almacen/transferencias', id]);
  }

  onConfirmar(t: Transferencia, ev?: Event): void {
    ev?.stopPropagation();
    if (!confirm(
      `¿Confirmar transferencia de ${t.almacen_origen_nombre} ` +
      `→ ${t.almacen_destino_nombre}? ` +
      `Esto moverá el stock inmediatamente.`)) { return; }
    this.svc.confirmarTransferencia(t.id!).subscribe({
      next: () => this.cargar(),
      error: (err) => alert(err.error?.error || 'Error al confirmar')
    });
  }

  onCancelar(t: Transferencia, ev?: Event): void {
    ev?.stopPropagation();
    if (!confirm('¿Cancelar esta transferencia?')) { return; }
    this.svc.cancelarTransferencia(t.id!).subscribe({
      next: () => this.cargar(),
      error: (err) => alert(err.error?.error || 'Error al cancelar')
    });
  }

  getColor(estado: string | undefined): string {
    const m: Record<string, string> = {
      pendiente: 'accent',
      completada: 'primary',
      cancelada: 'warn'
    };
    return m[estado || ''] || 'primary';
  }
}
