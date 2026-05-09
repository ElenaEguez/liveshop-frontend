import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ComprasService, OrdenCompra } from '../compras.service';

@Component({
  selector: 'app-orden-list',
  templateUrl: './orden-list.component.html',
  styleUrls: ['./orden-list.component.scss']
})
export class OrdenListComponent implements OnInit {
  ordenes: OrdenCompra[] = [];
  cargando = false;

  constructor(
    private comprasService: ComprasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.comprasService.getOrdenes().subscribe({
      next: (rows) => {
        this.ordenes = rows;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  irNueva(): void {
    this.router.navigate(['/compras/new']);
  }
}
