import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ComprasService, OrdenCompra } from '../compras.service';

@Component({
  selector: 'app-orden-detail',
  templateUrl: './orden-detail.component.html',
  styleUrls: ['./orden-detail.component.scss']
})
export class OrdenDetailComponent implements OnInit {
  orden: OrdenCompra | null = null;
  columnas = ['producto', 'almacen', 'cantidad', 'costo_unit', 'precio_venta', 'subtotal'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private comprasService: ComprasService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);
    if (id) {
      this.comprasService.getOrden(id).subscribe((o) => (this.orden = o));
    }
  }

  volver(): void {
    this.router.navigate(['/compras']);
  }

  editar(): void {
    if (!this.orden?.id) return;
    this.router.navigate(['/compras', this.orden.id, 'edit']);
  }

  confirmar(): void {
    if (!this.orden?.id) return;
    this.comprasService.confirmarOrden(this.orden.id).subscribe((o) => (this.orden = o));
  }

  cancelar(): void {
    if (!this.orden?.id) return;
    this.comprasService.cancelarOrden(this.orden.id).subscribe((o) => (this.orden = o));
  }
}
