import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WarehouseExtraService } from '../services/warehouse-extra.service';

@Component({
  selector: 'app-conteo-form',
  templateUrl: './conteo-form.component.html',
  styleUrls: ['./conteo-form.component.scss']
})
export class ConteoFormComponent implements OnInit {
  form = this.fb.group({
    almacen: [null, Validators.required],
    fecha: [
      new Date().toISOString().slice(0, 10),
      Validators.required,
    ],
    notas: [''],
  });

  almacenes: any[] = [];
  guardando = false;

  constructor(
    private fb: FormBuilder,
    private svc: WarehouseExtraService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.svc.getAlmacenes().subscribe(a => {
      this.almacenes = a;
    });
  }

  onVolver(): void {
    this.router.navigate(['/almacen/conteos']);
  }

  onGuardar(): void {
    if (this.form.invalid) { return; }
    this.guardando = true;
    this.svc.crearConteo(this.form.value).subscribe({
      next: (c) => {
        this.guardando = false;
        this.router.navigate(['/almacen/conteos', c.id]);
      },
      error: (err) => {
        this.guardando = false;
        alert(err.error?.error || err.error?.detail || 'Error al crear conteo');
      }
    });
  }
}
