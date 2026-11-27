import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Promocion, PromocionesService } from '../../promociones.service';
import { PromocionFormDialogComponent } from '../promocion-form-dialog/promocion-form-dialog.component';

@Component({
  selector: 'app-promocion-list',
  templateUrl: './promocion-list.component.html',
  styleUrls: ['./promocion-list.component.scss'],
})
export class PromocionListComponent implements OnInit {
  promociones: Promocion[] = [];
  loading = false;
  displayedColumns = ['nombre', 'tipo_valor', 'alcance', 'canales', 'vigencia', 'estado', 'acciones'];

  constructor(
    private svc: PromocionesService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.svc.getPromociones().subscribe({
      next: data => { this.promociones = data; this.loading = false; },
      error: () => {
        this.loading = false;
        this.snack.open('Error al cargar promociones.', 'Cerrar', { duration: 3000 });
      },
    });
  }

  abrirFormulario(promocion?: Promocion): void {
    const ref = this.dialog.open(PromocionFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      data: { promocion: promocion || null },
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) {
        this.snack.open('Promoción guardada.', 'OK', { duration: 2000 });
        this.cargar();
      }
    });
  }

  eliminar(promocion: Promocion): void {
    if (!confirm(`¿Eliminar la promoción "${promocion.nombre}"?`)) return;
    this.svc.deletePromocion(promocion.id).subscribe({
      next: () => {
        this.snack.open('Promoción eliminada.', 'OK', { duration: 2000 });
        this.promociones = this.promociones.filter(p => p.id !== promocion.id);
      },
      error: () => this.snack.open('No se pudo eliminar.', 'Cerrar', { duration: 3000 }),
    });
  }

  toggleActiva(promocion: Promocion): void {
    const nuevoValor = !promocion.activa;
    this.svc.updatePromocion(promocion.id, { activa: nuevoValor }).subscribe({
      next: actualizado => { promocion.activa = actualizado.activa; promocion.estado = actualizado.estado; },
      error: () => this.snack.open('No se pudo actualizar.', 'Cerrar', { duration: 3000 }),
    });
  }

  alcanceLabel(promocion: Promocion): string {
    const partes: string[] = [];
    if (promocion.productos_detalle?.length) {
      partes.push(`${promocion.productos_detalle.length} producto${promocion.productos_detalle.length !== 1 ? 's' : ''}`);
    }
    if (promocion.categorias_detalle?.length) {
      partes.push(`${promocion.categorias_detalle.length} categoría${promocion.categorias_detalle.length !== 1 ? 's' : ''}`);
    }
    return partes.join(' + ') || 'Sin alcance';
  }

  estadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      activa: 'Activa', programada: 'Programada', vencida: 'Vencida', inactiva: 'Inactiva',
    };
    return labels[estado] || estado;
  }

  estadoColor(estado: string): string {
    const colores: Record<string, string> = {
      activa: '#16a34a', programada: '#2563eb', vencida: '#6b7280', inactiva: '#dc2626',
    };
    return colores[estado] || '#6b7280';
  }
}
