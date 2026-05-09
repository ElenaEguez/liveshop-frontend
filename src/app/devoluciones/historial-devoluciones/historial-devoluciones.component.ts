import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import {
  DevolucionesService,
  Devolucion,
} from '../../payments/devoluciones.service';

@Component({
  selector: 'app-historial-devoluciones',
  templateUrl: './historial-devoluciones.component.html',
  styleUrls: ['./historial-devoluciones.component.scss'],
})
export class HistorialDevolucionesComponent implements OnInit {
  devoluciones: Devolucion[] = [];
  cargando = true;
  columnas = [
    'ticket',
    'tipo',
    'resolucion',
    'monto',
    'procesado_por',
    'fecha',
  ];

  constructor(
    private svc: DevolucionesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.svc.getDevoluciones().subscribe({
      next: (data) => {
        this.devoluciones = data;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  onNuevaDevolucion(): void {
    this.router.navigate(['/devoluciones/nueva']);
  }

  getColorTipo(tipo: string): string {
    return tipo === 'total' ? 'warn' : 'accent';
  }

  getColorResolucion(tipo: string): string {
    return tipo === 'devolucion_dinero' ? 'warn' : 'primary';
  }
}
