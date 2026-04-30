import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Inject } from '@angular/core';
import { Product, Category, Variant, ProductService } from '../products.service';

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
  productForm: FormGroup;
  categories: Category[] = [];
  selectedFiles: File[] = [];
  selectedFilePreviews: SafeUrl[] = [];
  existingImages: string[] = [];
  isEdit = false;
  viewOnly = false;
  sellByOptions = SELL_BY_OPTIONS;

  private syncingPrices = false;

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
      price:                [data.product?.price ?? '', [Validators.required, Validators.min(0)]],
      purchase_cost:        [data.product?.purchase_cost ?? null, [Validators.min(0)]],
      shipping_cost:        [data.product?.shipping_cost ?? null, [Validators.min(0)]],
      profit_margin_percent:[data.product?.profit_margin_percent ?? null, [Validators.min(0), Validators.max(9999)]],
      stock:                [data.product?.stock ?? '', [Validators.required, Validators.min(0)]],
      category:             [data.product?.category ?? '', Validators.required],
      is_active:            [data.product?.is_active ?? true],
      is_active_live:       [data.product?.is_active_live ?? true],
      is_active_pos:        [data.product?.is_active_pos ?? true],
      is_active_web:        [data.product?.is_active_web ?? true],
      barcode:              [data.product?.barcode ?? ''],
      internal_code:        [data.product?.internal_code ?? ''],
      sell_by:              this.fb.group(sellByGroup),
      variants:             this.fb.array(data.product?.variants?.map(v => this.createVariant(v)) || []),
    });

    if (this.viewOnly) {
      this.productForm.disable();
    }
  }

  ngOnInit(): void {
    this.loadCategories();
    if (!this.viewOnly) {
      this.setupPriceSync();
    }
  }

  private setupPriceSync(): void {
    const costCtrl     = this.productForm.get('purchase_cost')!;
    const shippingCtrl = this.productForm.get('shipping_cost')!;
    const marginCtrl   = this.productForm.get('profit_margin_percent')!;
    const priceCtrl    = this.productForm.get('price')!;

    // cost, shipping or margin → recalculate price
    const recalcPrice = () => {
      if (this.syncingPrices) return;
      const c = parseFloat(costCtrl.value) || 0;
      const s = parseFloat(shippingCtrl.value) || 0;
      const m = parseFloat(marginCtrl.value);
      const totalCost = c + s;
      if (isFinite(totalCost) && isFinite(m) && totalCost >= 0 && m >= 0) {
        this.syncingPrices = true;
        priceCtrl.setValue(+(totalCost * (1 + m / 100)).toFixed(2), { emitEvent: false });
        this.syncingPrices = false;
      }
    };

    costCtrl.valueChanges.subscribe(recalcPrice);
    shippingCtrl.valueChanges.subscribe(recalcPrice);
    marginCtrl.valueChanges.subscribe(recalcPrice);

    // price → recalculate margin (if total cost is set)
    priceCtrl.valueChanges.subscribe(() => {
      if (this.syncingPrices) return;
      const p = parseFloat(priceCtrl.value);
      const c = parseFloat(costCtrl.value) || 0;
      const s = parseFloat(shippingCtrl.value) || 0;
      const totalCost = c + s;
      if (isFinite(p) && totalCost > 0 && p >= 0) {
        this.syncingPrices = true;
        marginCtrl.setValue(+((p / totalCost - 1) * 100).toFixed(2), { emitEvent: false });
        this.syncingPrices = false;
      }
    });
  }

  // ── Category ────────────────────────────────────────────────────────────────

  loadCategories(): void {
    this.productService.getCategories().subscribe(
      categories => {
        this.categories = categories;
        const currentCategory = this.productForm.get('category')?.value;
        if (currentCategory) {
          this.productForm.get('category')?.setValue(currentCategory);
        }
      },
      error => console.error('Error loading categories:', error)
    );
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
    const barcode = this.productForm.get('barcode')?.value || '';
    const name    = this.productForm.get('name')?.value || '';
    const price   = this.productForm.get('price')?.value || '';
    if (!barcode) {
      this.snackBar.open('Genera o ingresa un código de barras primero', 'Cerrar', { duration: 3000 });
      return;
    }
    const w = window.open('', '_blank', 'width=380,height=280');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Etiqueta</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&display=swap">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 16px; margin: 0; }
        .prod-name { font-size: 13px; font-weight: bold; margin-bottom: 4px; }
        .barcode-font { font-family: "Libre Barcode 39 Text", monospace; font-size: 52px; line-height: 1; margin: 4px 0; }
        .barcode-num { font-size: 11px; letter-spacing: 2px; color: #333; }
        .price { font-size: 18px; font-weight: bold; margin-top: 8px; }
        @media print { @page { margin: 0.5cm; } }
      </style></head><body>
      <div class="prod-name">${name}</div>
      <div class="barcode-font">*${barcode}*</div>
      <div class="barcode-num">${barcode}</div>
      <div class="price">Bs. ${price}</div>
      <script>window.onload = function(){ window.print(); window.close(); };<\/script>
      </body></html>`);
    w.document.close();
  }

  // ── Images ──────────────────────────────────────────────────────────────────

  removeExistingImage(index: number): void {
    this.existingImages.splice(index, 1);
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blobUrl = URL.createObjectURL(file);
      this.selectedFiles.push(file);
      this.selectedFilePreviews.push(this.sanitizer.bypassSecurityTrustUrl(blobUrl));
    }
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
      stock:     [variant?.stock || 0, [Validators.required, Validators.min(0)]]
    });
  }

  hasVariantColor(index: number): boolean {
    return !!this.variants.at(index).get('color')?.value?.trim();
  }

  get variants(): FormArray {
    return this.productForm.get('variants') as FormArray;
  }

  get sumaStockVariantes(): number {
    if (!this.variants || this.variants.length === 0) return 0;
    return this.variants.controls.reduce((sum, ctrl) => sum + (Number(ctrl.get('stock')?.value) || 0), 0);
  }

  get stockVariantesInvalido(): boolean {
    const stockTotal = Number(this.productForm.get('stock')?.value) || 0;
    return this.sumaStockVariantes > stockTotal;
  }

  addVariant(): void {
    const defaultStock = this.variants.length === 0 ? (this.productForm.get('stock')?.value || 0) : 0;
    this.variants.push(this.createVariant({ stock: defaultStock }));
  }

  removeVariant(index: number): void {
    this.variants.removeAt(index);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.stockVariantesInvalido) {
      this.snackBar.open(
        `La suma de variantes (${this.sumaStockVariantes} uds.) supera el Stock Total (${this.productForm.get('stock')?.value} uds.).`,
        'Cerrar', { duration: 5000, panelClass: ['snack-error'] }
      );
      return;
    }
    if (this.productForm.invalid) return;

    const formData = new FormData();
    const val = this.productForm.value;

    Object.keys(val).forEach(key => {
      if (key === 'variants') {
        formData.append(key, JSON.stringify(val[key]));
      } else if (key === 'sell_by') {
        const sellByArr = Object.keys(val[key]).filter(k => val[key][k]);
        formData.append(key, JSON.stringify(sellByArr));
      } else if (key === 'purchase_cost' || key === 'shipping_cost' || key === 'profit_margin_percent') {
        const v = val[key];
        formData.append(key, v !== null && v !== undefined ? String(v) : '');
      } else if (key === 'barcode') {
        formData.append(key, val[key] ?? '');
      } else if (key === 'is_active' || key === 'is_active_live' || key === 'is_active_pos' || key === 'is_active_web') {
        formData.append(key, String(!!val[key]));
      } else {
        formData.append(key, val[key]);
      }
    });

    this.selectedFiles.forEach(file => formData.append('images', file));

    const request = this.isEdit
      ? this.productService.updateProduct(this.data.product!.id!, formData)
      : this.productService.createProduct(formData);

    request.subscribe(
      () => this.dialogRef.close(true),
      error => console.error('Error saving product:', error)
    );
  }

  onCancel(): void {
    if (this.productForm.dirty && !this.viewOnly) {
      if (!confirm('¿Descartar los cambios? Los datos ingresados se perderán.')) return;
    }
    this.dialogRef.close();
  }
}
