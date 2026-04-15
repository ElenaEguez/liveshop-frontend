import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime } from 'rxjs/operators';
import {
  SettingsService, MetodoPago, Sucursal, Cupon, Comprobante, TicketConfig, Caja,
} from '../settings.service';
import { MetodoPagoDialogComponent } from '../metodo-pago-dialog/metodo-pago-dialog.component';
import { CuponDialogComponent } from '../cupon-dialog/cupon-dialog.component';
import { SucursalDialogComponent } from '../sucursal-dialog/sucursal-dialog.component';
import { ExpensesService, CategoriaGasto } from '../../expenses/expenses.service';
import { VendorProfileService } from '../../my-store/services/vendor-profile.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {

  // ── Tab 1: Métodos de Pago ────────────────────────────────────────────────
  metodosPago: MetodoPago[] = [];
  mpCols = ['icono', 'nombre', 'tipo', 'orden', 'acciones'];

  // ── Tab 2: Ticket config ──────────────────────────────────────────────────
  ticketForm!: FormGroup;
  ticketPreview: TicketConfig = {
    mostrar_logo: true, nombre_empresa: 'Mi Tienda', ruc_nit: '',
    direccion: '', telefono: '', texto_pie: '¡Gracias por su compra!',
    mostrar_qr: false, moneda: 'Bs.', ancho_ticket: 80,
  };
  ticketSaving = false;

  // ── Tab 3: Sucursales & Cajas ─────────────────────────────────────────────
  sucursales: Sucursal[] = [];
  cajasBySucursal: Record<number, Caja[]> = {};
  newCajaNombre: Record<number, string> = {};
  newAlmacenNombre: Record<number, string> = {};

  // ── Tab 4: Comprobantes ───────────────────────────────────────────────────
  comprobantes: Comprobante[] = [];
  editingComp: number | null = null;
  editCorrelativo: Record<number, number> = {};
  compCols = ['tipo', 'serie', 'correlativo', 'acciones'];

  // ── Tab 5: Cupones ────────────────────────────────────────────────────────
  cupones: Cupon[] = [];
  cuponCols = ['codigo', 'tipo', 'valor', 'usos', 'vencimiento', 'status', 'acciones'];

  // ── Tab 6: Categorías de Gasto ───────────────────────────────────────────
  categoriasGasto: CategoriaGasto[] = [];
  newCategoriaNombre = '';
  now = new Date();

  // ── Vendor logo (para preview ticket) ────────────────────────────────────
  vendorLogo: string | null = null;

  // ── Método de inventario ──────────────────────────────────────────────────
  inventoryMethod: 'peps' | 'ueps' | 'promedio' = 'peps';
  inventoryMethodSaving = false;
  readonly inventoryMethodOptions = [
    { value: 'peps',     label: 'PEPS — Primeros en entrar, primeros en salir' },
    { value: 'ueps',     label: 'UEPS — Últimos en entrar, primeros en salir' },
    { value: 'promedio', label: 'Costo Promedio' },
  ];

  constructor(
    private fb: FormBuilder,
    private svc: SettingsService,
    private expensesSvc: ExpensesService,
    private vendorProfileSvc: VendorProfileService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.initTicketForm();
    this.loadAll();
  }

  private loadAll(): void {
    this.expensesSvc.getCategorias().subscribe(c => this.categoriasGasto = c);
    this.vendorProfileSvc.getProfile().subscribe({
      next: p => {
        this.vendorLogo = p.logo ?? null;
        this.inventoryMethod = p.inventory_method ?? 'peps';
      },
      error: () => {},
    });
    this.svc.getMetodosPago().subscribe(m => this.metodosPago = m);
    this.svc.getSucursales().subscribe(s => {
      this.sucursales = s;
      s.forEach(suc => this.loadCajas(suc.id));
    });
    this.svc.getComprobantes().subscribe(c => this.comprobantes = c);
    this.svc.getCupones().subscribe(c => this.cupones = c);
    this.svc.getTicketConfig().subscribe(cfg => {
      this.ticketPreview = cfg;
      this.ticketForm.patchValue(cfg, { emitEvent: false });
    });
  }

  // ── Ticket form ───────────────────────────────────────────────────────────

  private initTicketForm(): void {
    this.ticketForm = this.fb.group({
      mostrar_logo:    [true],
      nombre_empresa:  ['', Validators.required],
      ruc_nit:         [''],
      direccion:       [''],
      telefono:        [''],
      texto_pie:       ['¡Gracias por su compra!'],
      mostrar_qr:      [false],
      moneda:          ['Bs.'],
      ancho_ticket:    [80],
    });

    this.ticketForm.valueChanges.pipe(debounceTime(200)).subscribe(v => {
      this.ticketPreview = { ...this.ticketPreview, ...v };
    });
  }

  saveInventoryMethod(): void {
    this.inventoryMethodSaving = true;
    const fd = new FormData();
    fd.append('inventory_method', this.inventoryMethod);
    this.vendorProfileSvc.updateProfile(fd).subscribe({
      next: () => {
        this.inventoryMethodSaving = false;
        this.snack.open('Método de inventario guardado.', 'OK', { duration: 2500 });
      },
      error: () => {
        this.inventoryMethodSaving = false;
        this.snack.open('Error al guardar método de inventario.', 'OK', { duration: 3000 });
      },
    });
  }

  saveTicket(): void {
    if (this.ticketForm.invalid) return;
    this.ticketSaving = true;
    this.svc.saveTicketConfig(this.ticketForm.value).subscribe({
      next: () => { this.ticketSaving = false; this.snack.open('Configuración guardada.', 'OK', { duration: 2000 }); },
      error: () => { this.ticketSaving = false; this.snack.open('Error al guardar.', 'OK', { duration: 3000 }); },
    });
  }

  // ── Métodos de pago ───────────────────────────────────────────────────────

  abrirMetodoDialog(m?: MetodoPago): void {
    const ref = this.dialog.open(MetodoPagoDialogComponent, { width: '420px', data: { metodo: m }, disableClose: true });
    ref.afterClosed().subscribe(r => { if (r) { this.snack.open('Guardado.', 'OK', { duration: 2000 }); this.svc.getMetodosPago().subscribe(l => this.metodosPago = l); } });
  }

  eliminarMetodo(m: MetodoPago): void {
    if (!confirm(`¿Eliminar "${m.nombre}"?`)) return;
    this.svc.deleteMetodoPago(m.id).subscribe({
      next: () => { this.metodosPago = this.metodosPago.filter(x => x.id !== m.id); this.snack.open('Eliminado.', 'OK', { duration: 2000 }); },
      error: () => this.snack.open('Error al eliminar.', 'OK', { duration: 3000 }),
    });
  }

  // ── Sucursales & Cajas ────────────────────────────────────────────────────

  loadCajas(sucId: number): void {
    this.svc.getCajas(sucId).subscribe(c => this.cajasBySucursal[sucId] = c);
  }

  toggleSucursal(suc: Sucursal): void {
    this.svc.updateSucursal(suc.id, { activa: !suc.activa }).subscribe({
      next: updated => {
        const idx = this.sucursales.findIndex(x => x.id === suc.id);
        if (idx >= 0) this.sucursales[idx] = updated;
        this.snack.open(`Sucursal ${updated.activa ? 'activada' : 'desactivada'}.`, 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Error al actualizar sucursal.', 'OK', { duration: 3000 }),
    });
  }

  eliminarSucursal(suc: Sucursal): void {
    if (!confirm(`¿Eliminar sucursal "${suc.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.svc.deleteSucursal(suc.id).subscribe({
      next: () => {
        this.sucursales = this.sucursales.filter(x => x.id !== suc.id);
        delete this.cajasBySucursal[suc.id];
        this.snack.open('Sucursal eliminada.', 'OK', { duration: 2000 });
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.detail || 'No se puede eliminar: tiene ventas registradas.';
        this.snack.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  abrirSucursalDialog(suc?: Sucursal): void {
    const ref = this.dialog.open(SucursalDialogComponent, {
      width: '440px',
      data: { sucursal: suc },
      disableClose: true,
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      if (suc) {
        const idx = this.sucursales.findIndex(x => x.id === suc.id);
        if (idx >= 0) this.sucursales[idx] = result;
      } else {
        this.sucursales.push(result);
        this.loadCajas(result.id);
      }
      this.snack.open(suc ? 'Sucursal actualizada.' : 'Sucursal creada.', 'OK', { duration: 2000 });
    });
  }

  agregarCaja(sucId: number): void {
    const nombre = (this.newCajaNombre[sucId] || '').trim();
    if (!nombre) return;
    this.svc.createCaja(sucId, nombre).subscribe({
      next: () => { this.newCajaNombre[sucId] = ''; this.loadCajas(sucId); this.snack.open('Caja agregada.', 'OK', { duration: 2000 }); },
      error: (err) => {
        const msg = err.error?.nombre?.[0] || err.error?.error || err.error?.detail || 'Error al crear caja.';
        this.snack.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  eliminarCaja(sucId: number, caja: Caja): void {
    if (!confirm(`¿Eliminar caja "${caja.nombre}"?`)) return;
    this.svc.deleteCaja(sucId, caja.id).subscribe({
      next: () => {
        this.cajasBySucursal[sucId] = this.cajasBySucursal[sucId].filter(c => c.id !== caja.id);
        this.snack.open('Caja eliminada.', 'OK', { duration: 2000 });
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.detail || 'No se puede eliminar: tiene ventas o turnos registrados.';
        this.snack.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  agregarAlmacen(sucId: number): void {
    const nombre = (this.newAlmacenNombre[sucId] || '').trim();
    if (!nombre) return;
    this.svc.createAlmacen(sucId, nombre).subscribe({
      next: () => { this.newAlmacenNombre[sucId] = ''; this.svc.getSucursales().subscribe(s => this.sucursales = s); this.snack.open('Almacén agregado.', 'OK', { duration: 2000 }); },
      error: () => this.snack.open('Error al crear almacén.', 'OK', { duration: 3000 }),
    });
  }

  eliminarAlmacen(sucId: number, almacen: { id: number; nombre: string }): void {
    if (!confirm(`¿Eliminar almacén "${almacen.nombre}"? Los kardex asociados quedarán sin almacén.`)) return;
    this.svc.deleteAlmacen(almacen.id).subscribe({
      next: () => {
        const suc = this.sucursales.find(s => s.id === sucId);
        if (suc) suc.almacenes = suc.almacenes.filter(a => a.id !== almacen.id);
        this.snack.open('Almacén eliminado.', 'OK', { duration: 2000 });
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.detail || 'No se puede eliminar: tiene inventarios activos.';
        this.snack.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  // ── Comprobantes ──────────────────────────────────────────────────────────

  editarCorrelativo(c: Comprobante): void {
    this.editingComp = c.id;
    this.editCorrelativo[c.id] = c.correlativo;
  }

  guardarCorrelativo(c: Comprobante): void {
    this.svc.updateComprobante(c.id, { correlativo: this.editCorrelativo[c.id], serie: c.serie }).subscribe({
      next: updated => {
        const idx = this.comprobantes.findIndex(x => x.id === c.id);
        if (idx >= 0) this.comprobantes[idx] = updated;
        this.editingComp = null;
        this.snack.open('Correlativo actualizado.', 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Error.', 'OK', { duration: 3000 }),
    });
  }

  // ── Cupones ───────────────────────────────────────────────────────────────

  abrirCuponDialog(c?: Cupon): void {
    const ref = this.dialog.open(CuponDialogComponent, { width: '480px', data: c || null, disableClose: true });
    ref.afterClosed().subscribe(r => { if (r) { this.snack.open('Guardado.', 'OK', { duration: 2000 }); this.svc.getCupones().subscribe(l => this.cupones = l); } });
  }

  toggleCupon(c: Cupon): void {
    this.svc.updateCupon(c.id, { activo: !c.activo }).subscribe({
      next: updated => { const idx = this.cupones.findIndex(x => x.id === c.id); if (idx >= 0) this.cupones[idx] = updated; },
    });
  }

  eliminarCupon(c: Cupon): void {
    if (!confirm(`¿Eliminar cupón "${c.codigo}"?`)) return;
    this.svc.deleteCupon(c.id).subscribe({
      next: () => { this.cupones = this.cupones.filter(x => x.id !== c.id); this.snack.open('Cupón eliminado.', 'OK', { duration: 2000 }); },
    });
  }

  // ── Categorías de Gasto ───────────────────────────────────────────────────

  agregarCategoria(): void {
    const nombre = this.newCategoriaNombre.trim();
    if (!nombre) return;
    this.expensesSvc.createCategoria(nombre).subscribe({
      next: cat => {
        this.categoriasGasto = [...this.categoriasGasto, cat];
        this.newCategoriaNombre = '';
        this.snack.open('Categoría agregada.', 'OK', { duration: 2000 });
      },
      error: err => {
        const msg = err.error?.nombre?.[0] || err.error?.detail || 'Error al crear categoría.';
        this.snack.open(msg, 'OK', { duration: 3000 });
      },
    });
  }

  eliminarCategoria(c: CategoriaGasto): void {
    if (!confirm(`¿Eliminar categoría "${c.nombre}"?`)) return;
    this.expensesSvc.deleteCategoria(c.id).subscribe({
      next: () => {
        this.categoriasGasto = this.categoriasGasto.filter(x => x.id !== c.id);
        this.snack.open('Categoría eliminada.', 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Error al eliminar categoría.', 'OK', { duration: 3000 }),
    });
  }

  get ticketWidthPx(): number {
    return this.ticketPreview.ancho_ticket === 58 ? 220 : 300;
  }

  sampleItems = [
    { nombre: 'Producto ejemplo', cant: 2, precio: 25.00 },
    { nombre: 'Otro producto', cant: 1, precio: 15.50 },
  ];

  get sampleTotal(): number {
    return this.sampleItems.reduce((s, i) => s + i.cant * i.precio, 0);
  }
}
