import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Inject } from '@angular/core';
import { printHtmlInHiddenIframe } from '../../shared/print-utils';
import JsBarcode from 'jsbarcode';
import { Product, Category, Variant, ProductVariant, ProductService } from '../products.service';
import { httpErrorMessage } from '../../shared/api-utils';
import { markAllAsTouched } from '../../shared/form-utils';

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
  /** Etiqueta térmica: 4,6 cm ancho × 5,6 cm alto */
  private static readonly LABEL_W_MM = 46;
  private static readonly LABEL_H_MM = 56;

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

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<ProductFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product?: Product; viewOnly?: boolean }
  ) {
    this.isEdit = !!data.product;
    this.viewOnly = !!data.viewOnly;
    this.existingImages = data.product?.images ? [...data.product.images] : [];

    const sellByValues = data.product?.sell_by ?? ['unidad'];
    const sellByGroup: Record<string, boolean> = {};
    SELL_BY_OPTIONS.forEach(o => { sellByGroup[o.value] = sellByValues.includes(o.value); });

    this.productForm = this.fb.group({
      name:                 [data.product?.name ?? '', Validators.required],
      description:          [data.product?.description ?? ''],
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
    let digits = '';
    for (let i = 0; i < 12; i++) digits += Math.floor(Math.random() * 10);
    // EAN-13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    this.productForm.get('barcode')!.setValue(digits + check);
  }

  generateInternalCode(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'INT-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    this.productForm.get('internal_code')!.setValue(code);
  }

  printBarcodeLabel(): void {
    const barcode = String(this.productForm.get('barcode')?.value || '').trim();
    const name = String(this.productForm.get('name')?.value || '').trim();
    if (!barcode) {
      this.snackBar.open('Genera o ingresa un código de barras primero', 'Cerrar', { duration: 3000 });
      return;
    }
    const canvas = this.renderBarcodeCanvas(barcode);
    if (!canvas) {
      this.snackBar.open(
        'No se pudo generar el código de barras. Use 13 dígitos (EAN-13) o un texto válido.',
        'Cerrar',
        { duration: 4500 },
      );
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    const html = this.buildLabelPrintHtml(name, barcode, dataUrl);
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
    const barcode = String(this.productForm.get('barcode')?.value || '').trim();
    const name = String(this.productForm.get('name')?.value || 'producto').trim();
    if (!barcode) {
      this.snackBar.open('Genera o ingresa un código de barras primero', 'Cerrar', { duration: 3000 });
      return;
    }
    const canvas = this.renderBarcodeCanvas(barcode);
    if (!canvas) {
      this.snackBar.open('No se pudo generar la imagen del código.', 'Cerrar', { duration: 4000 });
      return;
    }
    const safeName = name.replace(/[^\w\-]+/g, '_').slice(0, 48) || 'producto';
    canvas.toBlob((blob) => {
      if (!blob) {
        this.snackBar.open('No se pudo crear el archivo.', 'Cerrar', { duration: 3000 });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiqueta-${safeName}-${barcode}.png`;
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

  /** EAN-13 si hay 12–13 dígitos; si no, CODE128. */
  private renderBarcodeCanvas(raw: string): HTMLCanvasElement | null {
    const trimmed = (raw || '').trim();
    if (!trimmed) {
      return null;
    }
    const canvas = document.createElement('canvas');
    const onlyDigits = trimmed.replace(/\D/g, '');
    try {
      const narrowOpts = {
        width: 1.1,
        height: 36,
        displayValue: false,
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
      };
      if (onlyDigits.length === 13) {
        JsBarcode(canvas, onlyDigits, { ...narrowOpts, format: 'EAN13' });
        return canvas;
      }
      if (onlyDigits.length === 12) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          sum += parseInt(onlyDigits[i], 10) * (i % 2 === 0 ? 1 : 3);
        }
        const check = (10 - (sum % 10)) % 10;
        JsBarcode(canvas, onlyDigits + check, { ...narrowOpts, format: 'EAN13' });
        return canvas;
      }
      JsBarcode(canvas, trimmed, {
        format: 'CODE128',
        width: 1,
        height: 32,
        displayValue: false,
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
      });
      return canvas;
    } catch (e) {
      console.warn('JsBarcode error', e);
      return null;
    }
  }

  private buildLabelPrintHtml(productName: string, barcode: string, imageDataUrl: string): string {
    const nameEsc = this.escapeHtml(productName || '—');
    const codeEsc = this.escapeHtml(barcode);
    const w = ProductFormComponent.LABEL_W_MM;
    const h = ProductFormComponent.LABEL_H_MM;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiqueta</title>
<style>
  @page { size: ${w}mm ${h}mm; margin: 0; }
  @media print {
    html, body { width: ${w}mm; height: ${h}mm; margin: 0; padding: 0; background: #fff; overflow: hidden; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    width: ${w}mm;
    height: ${h}mm;
    text-align: center;
    background: #fff;
    overflow: hidden;
  }
  .label {
    width: ${w}mm;
    height: ${h}mm;
    padding: 1.2mm 1mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    overflow: hidden;
  }
  .prod-name {
    font-size: 7pt;
    font-weight: 700;
    line-height: 1.15;
    max-height: 11mm;
    overflow: hidden;
    word-break: break-word;
    width: 100%;
    flex-shrink: 0;
  }
  .barcode-wrap {
    flex: 1;
    width: 100%;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .barcode-img {
    max-width: ${w - 2}mm;
    max-height: 34mm;
    width: auto;
    height: auto;
    display: block;
    object-fit: contain;
  }
  .barcode-num {
    font-size: 7pt;
    letter-spacing: 0.08em;
    line-height: 1.1;
    color: #000;
    flex-shrink: 0;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style></head><body>
  <div class="label">
    <div class="prod-name">${nameEsc}</div>
    <div class="barcode-wrap"><img class="barcode-img" src="${imageDataUrl}" alt="" /></div>
    <div class="barcode-num">${codeEsc}</div>
  </div>
  <script>window.addEventListener('load', function () {
    setTimeout(function () { window.focus(); window.print(); }, 200);
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

    this.saving = true;
    const formData = new FormData();
    const val = this.productForm.value;

    Object.keys(val).forEach(key => {
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
    // Compatibilidad con servidores que aun requieren price en el serializer.
    // El precio oficial se actualiza desde Compras, no desde este formulario.
    if (!formData.has('price')) {
      formData.append('price', '0');
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
