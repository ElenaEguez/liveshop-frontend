import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { VentaPOS } from '../pos.service';
import { TicketConfig } from '../../settings/settings.service';
import { printHtmlInHiddenIframe } from '../../shared/print-utils';

export interface TicketPreviewData {
  venta: VentaPOS;
  vendorName: string;
  moneda: string;
  showNuevaVenta?: boolean;
  ticketConfig?: TicketConfig;
  vendorQrImage?: string | null;
}

@Component({
  selector: 'app-ticket-preview-dialog',
  templateUrl: './ticket-preview-dialog.component.html',
})
export class TicketPreviewDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TicketPreviewData,
    private dialogRef: MatDialogRef<TicketPreviewDialogComponent>,
  ) {}

  get config(): TicketConfig | null {
    return this.data.ticketConfig || null;
  }

  get ticketWidthPx(): number {
    return this.config?.ancho_ticket === 58 ? 220 : 300;
  }

  imprimir(): void {
    const el = document.getElementById('ticket-print');
    if (!el) { window.print(); return; }
    const content = el.innerHTML;
    const pageSize = this.config?.ancho_ticket === 58 ? '58mm' : '80mm';
    const ticketMax = this.config?.ancho_ticket === 58 ? '52mm' : '72mm';
    const html = `
      <html><head><title>Ticket</title>
      <meta charset="utf-8">
      <style>
        @page { size: ${pageSize} auto; margin: 2mm; }
        @media print {
          body { margin: 0; padding: 0; }
        }
        body { font-family: monospace; font-size: 11px; margin: 0; padding: 6px; }
        .ticket { max-width: ${ticketMax}; margin: 0 auto; }
        .ticket-header { text-align: center; margin-bottom: 4px; }
        .ticket-logo { text-align: center; margin-bottom: 6px; }
        .ticket-logo-img { max-height: 60px; max-width: 140px; object-fit: contain; }
        .store-name { font-size: 14px; font-weight: bold; }
        .ticket-meta { font-size: 11px; color: #555; }
        .ticket-divider { border-top: 1px dashed #aaa; margin: 4px 0; }
        .ticket-client { font-size: 12px; margin: 4px 0; }
        .ticket-items { margin: 4px 0; }
        .ticket-item-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
        .ticket-item { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
        .item-name { flex: 2; }
        .ticket-totals { margin-top: 4px; }
        .ticket-total-row { display: flex; justify-content: space-between; font-size: 12px; margin: 2px 0; }
        .total-final { font-weight: bold; font-size: 14px; }
        .ticket-footer { text-align: center; font-size: 11px; margin-top: 6px; color: #666; }
        .ticket-qr { text-align: center; margin-top: 8px; }
        .ticket-qr-label { font-size: 11px; color: #555; margin-bottom: 4px; }
        .ticket-qr-img { max-width: 100px; max-height: 100px; }
      </style></head><body>
      <div class="ticket">${content}</div>
      <script>window.addEventListener('load', function () {
        setTimeout(function () { window.focus(); window.print(); }, 200);
      });<\/script>
      </body></html>`;

    const win = window.open('', '_blank', 'width=400,height=700');
    if (win) {
      try {
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
      } catch {
        printHtmlInHiddenIframe(html);
      }
      return;
    }
    printHtmlInHiddenIframe(html);
  }

  nuevaVenta(): void {
    this.dialogRef.close('nueva');
  }
}
