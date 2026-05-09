import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WarehouseExtraService, Transferencia } from '../services/warehouse-extra.service';

@Component({
  selector: 'app-transferencia-detail',
  templateUrl: './transferencia-detail.component.html',
  styleUrls: ['./transferencia-detail.component.scss']
})
export class TransferenciaDetailComponent implements OnInit {
  t: Transferencia | null = null;
  cargando = true;
  columnas = ['producto', 'variante', 'cantidad'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: WarehouseExtraService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);
    if (!id) {
      this.router.navigate(['/almacen/transferencias']);
      return;
    }
    this.cargar(id);
  }

  cargar(id: number): void {
    this.cargando = true;
    this.svc.getTransferencia(id).subscribe({
      next: (x) => {
        this.t = x;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.router.navigate(['/almacen/transferencias']);
      }
    });
  }

  volver(): void {
    this.router.navigate(['/almacen/transferencias']);
  }

  confirmar(): void {
    if (!this.t?.id) { return; }
    if (!confirm('¿Confirmar transferencia? Se moverá el stock.')) { return; }
    this.svc.confirmarTransferencia(this.t.id).subscribe({
      next: (x) => { this.t = x; },
      error: (err) => alert(err.error?.error || 'Error al confirmar')
    });
  }

  cancelar(): void {
    if (!this.t?.id) { return; }
    if (!confirm('¿Cancelar esta transferencia?')) { return; }
    this.svc.cancelarTransferencia(this.t.id).subscribe({
      next: (x) => { this.t = x; },
      error: (err) => alert(err.error?.error || 'Error al cancelar')
    });
  }

  estadoColor(estado: string | undefined): string {
    switch (estado) {
      case 'pendiente': return 'accent';
      case 'completada': return 'primary';
      case 'cancelada': return 'warn';
      default: return 'primary';
    }
  }
}
