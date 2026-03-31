import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { InventoryService, KardexMovimiento } from '../../services/inventory.service';

export interface KardexDialogData {
  productId: number;
  productName: string;
}

@Component({
  selector: 'app-kardex-dialog',
  templateUrl: './kardex-dialog.component.html',
  styleUrls: ['./kardex-dialog.component.scss'],
})
export class KardexDialogComponent implements OnInit {
  movimientos: KardexMovimiento[] = [];
  loading = false;
  totalCount = 0;
  pageSize = 20;
  currentPage = 1;

  filterTipo = '';
  filterMotivo = '';
  filterDesde = '';
  filterHasta = '';

  tipoOpts = [
    { value: '', label: 'Todos' },
    { value: 'entrada', label: 'Entrada' },
    { value: 'salida', label: 'Salida' },
    { value: 'ajuste', label: 'Ajuste' },
    { value: 'transferencia', label: 'Transferencia' },
  ];

  motivoOpts = [
    { value: '', label: 'Todos' },
    { value: 'venta', label: 'Venta POS' },
    { value: 'venta_live', label: 'Venta Live' },
    { value: 'compra', label: 'Compra / Reposición' },
    { value: 'ajuste_manual', label: 'Ajuste manual' },
    { value: 'devolucion', label: 'Devolución' },
    { value: 'transferencia', label: 'Transferencia' },
  ];

  displayedColumns = ['fecha', 'tipo', 'motivo', 'cantidad', 'stock', 'documento', 'usuario'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: KardexDialogData,
    private svc: InventoryService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.getKardex({
      product_id: this.data.productId,
      tipo:        this.filterTipo   || undefined,
      motivo:      this.filterMotivo || undefined,
      fecha_desde: this.filterDesde  || undefined,
      fecha_hasta: this.filterHasta  || undefined,
      page:        this.currentPage,
      page_size:   this.pageSize,
    }).subscribe({
      next: res => {
        this.movimientos = res.results;
        this.totalCount  = res.count;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.load();
  }

  clearFilters(): void {
    this.filterTipo   = '';
    this.filterMotivo = '';
    this.filterDesde  = '';
    this.filterHasta  = '';
    this.currentPage  = 1;
    this.load();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  prevPage(): void {
    if (this.currentPage > 1) { this.currentPage--; this.load(); }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) { this.currentPage++; this.load(); }
  }

  private readonly motivoLabels: Record<string, string> = {
    venta: 'Venta POS',
    venta_live: 'Venta Live',
    compra: 'Compra / Reposición',
    ajuste_manual: 'Ajuste manual',
    devolucion: 'Devolución',
    transferencia: 'Transferencia',
  };

  motivoLabel(motivo: string): string {
    return this.motivoLabels[motivo] ?? motivo;
  }

  tipoColor(tipo: string): string {
    return tipo === 'entrada' ? '#166534' : tipo === 'salida' ? '#991b1b' : '#374151';
  }

  tipoBg(tipo: string): string {
    return tipo === 'entrada' ? '#dcfce7' : tipo === 'salida' ? '#fee2e2' : '#f3f4f6';
  }

  cantidadLabel(m: KardexMovimiento): string {
    return m.cantidad > 0 ? `+${m.cantidad}` : `${m.cantidad}`;
  }

  get totalSalidas(): number {
    return this.movimientos
      .filter(m => m.tipo === 'salida')
      .reduce((s, m) => s + Math.abs(m.cantidad), 0);
  }

  get totalEntradas(): number {
    return this.movimientos
      .filter(m => m.tipo === 'entrada')
      .reduce((s, m) => s + m.cantidad, 0);
  }
}
