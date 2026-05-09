import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ComprasService, Proveedor } from '../../compras.service';

@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.scss']
})
export class ProveedoresComponent implements OnInit {
  proveedores: Proveedor[] = [];
  mostrarForm = false;
  editandoId: number | null = null;
  guardando = false;
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private comprasService: ComprasService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      contacto: [''],
      telefono: [''],
      email: [''],
      notas: [''],
      activo: [true],
    });
    this.cargar();
  }

  cargar(): void {
    this.comprasService.getProveedores().subscribe({
      next: (list) => { this.proveedores = list; },
      error: (err) => console.error(err)
    });
  }

  onNuevo(): void {
    this.editandoId = null;
    this.form.reset({ activo: true, nombre: '', contacto: '', telefono: '', email: '', notas: '' });
    this.mostrarForm = true;
  }

  onEditar(p: Proveedor): void {
    this.editandoId = p.id ?? null;
    this.form.patchValue({
      nombre: p.nombre,
      contacto: p.contacto || '',
      telefono: p.telefono || '',
      email: p.email || '',
      notas: p.notas || '',
      activo: p.activo !== false,
    });
    this.mostrarForm = true;
  }

  onCancelar(): void {
    this.editandoId = null;
    this.mostrarForm = false;
    this.form.reset({ activo: true });
  }

  onGuardar(): void {
    if (this.form.invalid || this.guardando) { return; }
    this.guardando = true;
    const v = this.form.value;
    const op = this.editandoId != null
      ? this.comprasService.actualizarProveedor(this.editandoId, v)
      : this.comprasService.crearProveedor(v);
    op.subscribe({
      next: () => {
        this.guardando = false;
        this.onCancelar();
        this.cargar();
      },
      error: (err) => {
        this.guardando = false;
        alert(err.error?.detail || err.error?.error || 'Error al guardar');
      }
    });
  }

  onToggleActivo(p: Proveedor): void {
    this.comprasService.actualizarProveedor(
      p.id!, { activo: !p.activo }
    ).subscribe({
      next: () => this.cargar(),
      error: (err) => console.error(err)
    });
  }
}
