import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Inject } from '@angular/core';
import { printHtmlInHiddenIframe } from '../../shared/print-utils';
import JsBarcode from 'jsbarcode';
import { Product, Category, Variant, ProductVariant, ProductService } from '../products.service';
import { AuthService } from '../../auth/auth.service';
import { httpErrorMessage } from '../../shared/api-utils';
import { markAllAsTouched } from '../../shared/form-utils';
import { ean13ForRender, generateEan13, isValidEan13 } from '../../shared/barcode-utils';

export const SELL_BY_OPTIONS = [
  { value: 'unidad', label: 'UNIDAD' },
  { value: 'qq',     label: 'GRANEL (QQ)' },
  { value: 'lbs',    label: 'GRANEL (LBS)' },
  { value: 'lts',    label: 'LITRO (LTS)' },
];

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit, OnDestroy {
  /** Etiqueta térmica 4,6 × 2,8 cm (impresión estándar). Rollo físico 5,6 cm: mitades arriba/abajo. */
  private static readonly LABEL_W_MM = 46;
  private static readonly LABEL_H_MM = 28;
  private static readonly SHEET_H_MM = 56;

  readonly maxImages = 3;
  productForm: FormGroup;
  categories: Category[] = [];
  selectedFiles: File[] = [];
  selectedFilePreviews: SafeUrl[] = [];
  existingImages: string[] = [];
  isEdit = false;
  viewOnly = false;
  saving = false;
  sellByOptions = SELL_BY_OPTIONS;
  sellByError = false;
  precioEditable = true;
  /** MODO SIMPLE - muestra campo stock inicial al crear producto */
  modoSimple = false;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<ProductFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product?: Product; viewOnly?: boolean }
  ) {
    this.isEdit = !!data.product;
    this.viewOnly = !!data.viewOnly;
    this.existingImages = data.product?.images ? [...data.product.images] : [];

    const payload = this.authService.getTokenPayload();
    this.precioEditable = payload?.precio_editable ?? true;
    this.modoSimple = payload?.modo_simple === true;

    const sellByValues = data.product?.sell_by ?? ['unidad'];
    const sellByGroup: Record<string, boolean> = {};
    SELL_BY_OPTIONS.forEach(o => { sellByGroup[o.value] = sellByValues.includes(o.value); });

    this.productForm = this.fb.group({
      name:                 [data.product?.name ?? '', Validators.required],
      description:          [data.product?.description ?? ''],
      price:                [data.product?.price ?? '',
        this.precioEditable
          ? [Validators.required, Validators.min(0)]
          : [Validators.min(0)]],
      stock:                [0],
      category:             [data.product?.category ?? '', Validators.required],
      is_active:            [data.product?.is_active ?? true],
      is_active_live:       [data.product?.is_active_live ?? true],
      is_active_pos:        [data.product?.is_active_pos ?? true],
      is_active_web:        [data.product?.is_active_web ?? true],
      web_is_bestseller:    [data.product?.web_is_bestseller ?? false],
      web_is_new:           [data.product?.web_is_new ?? false],
      compare_at_price:     [data.product?.compare_at_price ?? null],
      barcode:              [data.product?.barcode ?? ''],
      internal_code:        [data.product?.internal_code ?? ''],
      sell_by:              this.fb.group(sellByGroup),
      variants:             this.fb.array(this.initialVariants(data.product).map(v => this.createVariant(v))),
    });

    if (this.viewOnly) {
      this.productForm.disable();
    }
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  /** Preferir variantes de BD (compras/POS); fallback al JSON legacy. */
  private initialVariants(product?: Product): Variant[] {
    if (!product) {
      return [];
    }
    const fromDb = product.variantes;
    if (Array.isArray(fromDb) && fromDb.length) {
      return fromDb.map((v: ProductVariant) => ({
        size: v.talla || '',
        color: v.color || '',
        color_hex: v.color_hex || '',
        stock: v.stock_extra ?? 0,
      }));
    }
    if (Array.isArray(product.variants) && product.variants.length) {
      return product.variants;
    }
    return [];
  }

  // ── Category ────────────────────────────────────────────────────────────────

  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: categories => {
        this.categories = categories;
        const currentCategory = this.productForm.get('category')?.value;
        if (currentCategory) {
          this.productForm.get('category')?.setValue(currentCategory);
        }
      },
      error: err => {
        console.error('Error loading categories:', err);
        this.snackBar.open(
          httpErrorMessage(err, 'No se pudieron cargar las categorías.'),
          'Cerrar',
          { duration: 5000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  compareById(a: any, b: any): boolean {
    return Number(a) === Number(b);
  }

  // ── Barcode / Internal code generators ──────────────────────────────────────

  generateBarcode(): void {
    this.productForm.get('barcode')!.setValue(generateEan13());
  }

  private ensureScannableBarcodeInForm(notify: boolean): void {
    const ctrl = this.productForm.get('barcode');
    const current = String(ctrl?.value || '').trim();
    if (isValidEan13(current)) {
      return;
    }
    ctrl?.setValue(generateEan13());
    if (notify) {
      this.snackBar.open(
        'Se asignó un código EAN-13 escaneable (el anterior no era válido para lectores).',
        'Cerrar',
        { duration: 5000 },
      );
    }
  }

  generateInternalCode(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'INT-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    this.productForm.get('internal_code')!.setValue(code);
  }

  /** Puede imprimir si hay código interno o código de barras. */
  get canPrintLabel(): boolean {
    const code = String(this.productForm.get('internal_code')?.value || '').trim();
    const barcode = String(this.productForm.get('barcode')?.value || '').trim();
    return !!(code || barcode);
  }

  private getLabelPrintPayload(): {
    codigo: string;
    talla: string;
    precio: string;
    barcodeScan: string;
    name: string;
  } | null {
    const internalCode = String(this.productForm.get('internal_code')?.value || '').trim();
    const barcode = String(this.productForm.get('barcode')?.value || '').trim();
    const codigo = internalCode || barcode;
    if (!codigo) {
      return null;
    }
    return {
      codigo,
      talla: this.getLabelTalla(),
      precio: this.getLabelPrecio(),
      barcodeScan: isValidEan13(barcode) ? barcode : '',
      name: String(this.productForm.get('name')?.value || '').trim(),
    };
  }

  private getLabelTalla(): string {
    const arr = this.productForm.get('variants') as FormArray | null;
    if (!arr?.length) {
      return '—';
    }
    const lines: string[] = [];
    for (const ctrl of arr.controls) {
      const size = String(ctrl.get('size')?.value || '').trim();
      const color = String(ctrl.get('color')?.value || '').trim();
      const part = [size, color].filter(Boolean).join(' / ');
      if (part) {
        lines.push(part);
      }
    }
    if (!lines.length) {
      return '—';
    }
    if (lines.length === 1) {
      return lines[0];
    }
    return `${lines[0]} (+${lines.length - 1})`;
  }

  private getLabelPrecio(): string {
    const fromForm = this.productForm.get('price')?.value;
    const fromProduct = this.data.product?.price;
    const raw = fromForm !== null && fromForm !== '' && fromForm !== undefined
      ? fromForm
      : fromProduct;
    if (raw != null && !Number.isNaN(Number(raw))) {
      const n = Number(raw);
      const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2);
      return `${formatted} bs.`;
    }
    return '—';
  }

  /** single = 46×28 mm; top/bottom = mitad en rollo 5,6 cm */
  printBarcodeLabel(mode: 'single' | 'top' | 'bottom' = 'single'): void {
    if (!this.viewOnly) {
      this.ensureScannableBarcodeInForm(true);
    }
    const payload = this.getLabelPrintPayload();
    if (!payload) {
      this.snackBar.open('Ingresa código interno o código de barras', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!payload.barcodeScan) {
      this.snackBar.open('Guardá el producto con un EAN-13 válido antes de imprimir.', 'Cerrar', { duration: 4000 });
      return;
    }
    let barcodeDataUrl = '';
    const canvas = this.renderBarcodeCanvas(payload.barcodeScan, true);
    if (canvas) {
      barcodeDataUrl = canvas.toDataURL('image/png');
    }
    const html = this.buildLabelPrintHtml(payload, barcodeDataUrl, mode);
    const win = window.open('', '_blank', 'width=320,height=400');
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
    this.snackBar.open(
      'Ventana emergente bloqueada: imprimiendo desde esta página. Si falla, use «Descargar PNG».',
      'Cerrar',
      { duration: 4000 },
    );
    printHtmlInHiddenIframe(html);
  }

  downloadBarcodeLabelPng(): void {
    if (!this.viewOnly) {
      this.ensureScannableBarcodeInForm(true);
    }
    const payload = this.getLabelPrintPayload();
    if (!payload) {
      this.snackBar.open('Ingresa código interno o código de barras', 'Cerrar', { duration: 3000 });
      return;
    }
    const canvas = this.renderBarcodeCanvas(payload.barcodeScan, true);
    if (!canvas) {
      this.snackBar.open('No se pudo generar la imagen del código.', 'Cerrar', { duration: 4000 });
      return;
    }
    const safeName = payload.name.replace(/[^\w\-]+/g, '_').slice(0, 48) || 'producto';
    canvas.toBlob((blob) => {
      if (!blob) {
        this.snackBar.open('No se pudo crear el archivo.', 'Cerrar', { duration: 3000 });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiqueta-${safeName}-${payload.codigo}.png`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.snackBar.open('PNG descargado. Ábralo y comparta o imprímalo desde la galería.', 'Cerrar', {
        duration: 4000,
      });
    }, 'image/png');
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Solo EAN-13 (escaneable en POS). forLabel usa resolución mayor para impresión térmica. */
  private renderBarcodeCanvas(raw: string, forLabel = false): HTMLCanvasElement | null {
    const ean = ean13ForRender(raw);
    if (!ean) {
      return null;
    }
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, ean, {
        format: 'EAN13',
        width: forLabel ? 2 : 2.2,
        height: forLabel ? 28 : 48,
        displayValue: !forLabel,
        fontSize: forLabel ? 8 : 14,
        margin: forLabel ? 4 : 6,
        textMargin: forLabel ? 2 : 4,
        background: '#ffffff',
        lineColor: '#000000',
      });
      return canvas;
    } catch (e) {
      console.warn('JsBarcode error', e);
      return null;
    }
  }

  /** Recorta texto largo para que quepa en media etiqueta. */
  private truncateForLabel(text: string, maxLen: number): string {
    const t = (text || '').trim();
    if (t.length <= maxLen) return t;
    return t.slice(0, maxLen - 1) + '…';
  }

  private buildLabelPrintHtml(
    payload: { codigo: string; talla: string; precio: string; name: string },
    imageDataUrl: string,
    mode: 'single' | 'top' | 'bottom' = 'single',
  ): string {
    const codigoEsc = this.escapeHtml(this.truncateForLabel(payload.codigo, 20));
    const tallaEsc = this.escapeHtml(this.truncateForLabel(payload.talla, 16));
    const precioEsc = this.escapeHtml(payload.precio);
    const nameEsc = payload.name
      ? `<div class="prod-name">${this.escapeHtml(this.truncateForLabel(payload.name, 24))}</div>`
      : '';
    const barcodeBlock = imageDataUrl
      ? `<div class="barcode-wrap"><img class="barcode-img" src="${imageDataUrl}" alt="" /></div>`
      : '';
    const fieldsBlock = `
      <div class="fields-stack">
        <div class="field-row"><span class="field-label">Codigo</span><span class="field-value">${codigoEsc}</span></div>
        <div class="field-row"><span class="field-label">Talla</span><span class="field-value">${tallaEsc}</span></div>
        <div class="field-row"><span class="field-label">Precio</span><span class="field-value precio">${precioEsc}</span></div>
      </div>`;
    const w = ProductFormComponent.LABEL_W_MM;
    const h = ProductFormComponent.LABEL_H_MM;
    const sheetH = ProductFormComponent.SHEET_H_MM;
    const halfSheet = mode === 'top' || mode === 'bottom';
    const pageH = halfSheet ? sheetH : h;
    const slotTop = mode === 'bottom' ? h : 0;
    const labelBody = `${nameEsc}${fieldsBlock}${barcodeBlock}`;
    const labelInner = halfSheet
      ? `<div class="sheet"><div class="label-slot">${labelBody}</div></div>`
      : `<div class="label">${labelBody}</div>`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiqueta</title>
<style>
  @page { size: ${w}mm ${pageH}mm; margin: 0; }
  @media print {
    html, body { width: ${w}mm; height: ${pageH}mm; margin: 0; padding: 0; background: #fff; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    width: ${w}mm;
    height: ${pageH}mm;
    background: #fff;
    overflow: hidden;
  }
  .sheet { width: ${w}mm; height: ${sheetH}mm; position: relative; }
  .label, .label-slot {
    width: ${w}mm;
    padding: 0.6mm 1mm 0.5mm;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 0.25mm;
    text-align: center;
    overflow: hidden;
  }
  .label { height: ${h}mm; max-height: ${h}mm; }
  .label-slot {
    position: absolute;
    left: 0;
    top: ${slotTop}mm;
    height: ${h}mm;
    max-height: ${h}mm;
  }
  .prod-name {
    font-size: 5pt;
    font-weight: 700;
    line-height: 1.05;
    max-height: 3.5mm;
    overflow: hidden;
    flex-shrink: 0;
  }
  .fields-stack {
    display: flex;
    flex-direction: column;
    gap: 0.2mm;
    flex-shrink: 0;
  }
  .field-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.05;
  }
  .field-label {
    font-size: 3.8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .field-value {
    font-size: 6.5pt;
    font-weight: 700;
    padding: 0.1mm 0.3mm;
    border: 0.15mm solid #000;
    border-radius: 0.5mm;
    min-width: 70%;
    max-width: 100%;
    word-break: break-word;
  }
  .field-value.precio { font-size: 7pt; }
  .barcode-wrap {
    flex-shrink: 0;
    margin-top: 0.15mm;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    max-height: 9mm;
  }
  .barcode-img {
    width: ${w - 2}mm;
    max-width: 100%;
    max-height: 8.5mm;
    height: auto;
    display: block;
    object-fit: contain;
  }
</style></head><body>
  ${labelInner}
  <script>window.addEventListener('load', function () {
    setTimeout(function () { window.focus(); window.print(); }, 250);
  });<\/script>
</body></html>`;
  }

  // ── Images ──────────────────────────────────────────────────────────────────

  removeExistingImage(index: number): void {
    this.existingImages.splice(index, 1);
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const totalImages = this.existingImages.length + this.selectedFiles.length;
      if (totalImages >= this.maxImages) {
        this.snackBar.open(`Solo puedes tener hasta ${this.maxImages} imágenes por producto.`, 'Cerrar', { duration: 3500 });
        break;
      }
      const file = files[i];
      const blobUrl = URL.createObjectURL(file);
      this.selectedFiles.push(file);
      this.selectedFilePreviews.push(this.sanitizer.bypassSecurityTrustUrl(blobUrl));
    }
    if (event?.target) event.target.value = '';
  }

  removeFile(index: number): void {
    const preview = this.selectedFilePreviews[index];
    const raw = (preview as any).changingThisBreaksApplicationSecurity as string;
    if (raw) { URL.revokeObjectURL(raw); }
    this.selectedFiles.splice(index, 1);
    this.selectedFilePreviews.splice(index, 1);
  }

  ngOnDestroy(): void {
    this.selectedFilePreviews.forEach(preview => {
      const raw = (preview as any).changingThisBreaksApplicationSecurity as string;
      if (raw) { URL.revokeObjectURL(raw); }
    });
  }

  // ── Variants (legacy JSON array) ────────────────────────────────────────────

  createVariant(variant?: Variant): FormGroup {
    return this.fb.group({
      size:      [variant?.size      || ''],
      color:     [variant?.color     || ''],
      color_hex: [variant?.color_hex || ''],
    });
  }

  hasVariantColor(index: number): boolean {
    return !!this.variants.at(index).get('color')?.value?.trim();
  }

  get variants(): FormArray {
    return this.productForm.get('variants') as FormArray;
  }

  get sumaStockVariantes(): number {
    return 0;
  }

  get stockVariantesInvalido(): boolean {
    return false;
  }

  addVariant(): void {
    this.variants.push(this.createVariant());
  }

  removeVariant(index: number): void {
    this.variants.removeAt(index);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  hasSellBySelected(): boolean {
    const sellBy = this.productForm.get('sell_by')?.value as Record<string, boolean> | null;
    return !!sellBy && Object.values(sellBy).some(Boolean);
  }

  private variantRowsIncomplete(): boolean {
    for (let i = 0; i < this.variants.length; i++) {
      const row = this.variants.at(i).value as { size?: string; color?: string };
      const size = (row.size || '').trim();
      const color = (row.color || '').trim();
      if ((size && !color) || (!size && color)) {
        return true;
      }
    }
    return false;
  }

  onSubmit(): void {
    this.sellByError = false;
    if (this.saving) {
      return;
    }
    if (this.stockVariantesInvalido) {
      this.snackBar.open(
        `La suma de variantes (${this.sumaStockVariantes} uds.) debe ser igual al Stock Total (${this.productForm.get('stock')?.value} uds.).`,
        'Cerrar', { duration: 5000, panelClass: ['snack-error'] }
      );
      return;
    }
    markAllAsTouched(this.productForm);
    if (!this.hasSellBySelected()) {
      this.sellByError = true;
    }
    if (this.variantRowsIncomplete()) {
      this.snackBar.open(
        'Cada variante debe tener talla y color, o deja ambos vacíos.',
        'Cerrar',
        { duration: 5000, panelClass: ['snack-error'] },
      );
      return;
    }
    if (this.productForm.invalid || this.sellByError) {
      this.snackBar.open(
        'Completa los campos obligatorios: nombre, categoría y al menos una unidad de venta.',
        'Cerrar',
        { duration: 5000, panelClass: ['snack-error'] },
      );
      return;
    }

    this.ensureScannableBarcodeInForm(true);

    this.saving = true;
    const formData = new FormData();
    const val = this.productForm.value;

    Object.keys(val).forEach(key => {
      if (key === 'price') {
        return;
      }
      if (key === 'variants') {
        formData.append(key, JSON.stringify(val[key]));
      } else if (key === 'sell_by') {
        const sellByArr = Object.keys(val[key]).filter(k => val[key][k]);
        formData.append(key, JSON.stringify(sellByArr));
      } else if (key === 'barcode') {
        formData.append(key, val[key] ?? '');
      } else if (
        key === 'is_active' || key === 'is_active_live' || key === 'is_active_pos' || key === 'is_active_web'
        || key === 'web_is_bestseller' || key === 'web_is_new'
      ) {
        formData.append(key, String(!!val[key]));
      } else if (key === 'compare_at_price') {
        const raw = val[key];
        if (raw !== null && raw !== '' && raw !== undefined) {
          formData.append(key, String(raw));
        }
      } else {
        formData.append(key, val[key]);
      }
    });
    if (this.precioEditable) {
      const priceValue = this.productForm.get('price')?.value;
      if (priceValue !== null && priceValue !== undefined && priceValue !== '') {
        formData.append('price', String(priceValue));
      }
    }

    this.selectedFiles.forEach(file => formData.append('images', file));
    formData.append('keep_images', JSON.stringify(this.existingImages));

    const request = this.isEdit
      ? this.productService.updateProduct(this.data.product!.id!, formData)
      : this.productService.createProduct(formData);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open(
          this.isEdit ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.',
          'Cerrar',
          { duration: 3500 },
        );
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.saving = false;
        console.error('Error saving product:', error);
        this.snackBar.open(this.getSaveErrorMessage(error), 'Cerrar', {
          duration: 6000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  private getSaveErrorMessage(error: unknown): string {
    return httpErrorMessage(error, 'No se pudo guardar el producto.');
  }

  onCancel(): void {
    if (this.productForm.dirty && !this.viewOnly) {
      if (!confirm('¿Descartar los cambios? Los datos ingresados se perderán.')) return;
    }
    this.dialogRef.close();
  }
}
