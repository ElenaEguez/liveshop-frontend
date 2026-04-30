import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { trigger, transition, style, animate } from '@angular/animations';
import { forkJoin } from 'rxjs';

export interface CartItem {
  product: any;
  variant: any | null;
  variantLabel: string;
  quantity: number;
}

@Component({
  selector: 'app-live-order',
  templateUrl: './live-order.component.html',
  styleUrls: ['./live-order.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('panelSlide', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('280ms ease', style({ transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('220ms ease', style({ transform: 'translateY(100%)' }))
      ])
    ])
  ]
})
export class LiveOrderComponent implements OnInit, OnDestroy {

  // ── Session ──────────────────────────────────────────────────────────────
  slug = '';
  vendorSlug = '';
  session: any = null;
  loading = true;
  error = '';

  // ── Single-product flow ──────────────────────────────────────────────────
  selectedProduct: any = null;
  selectedVariant: any = null;
  orderForm: FormGroup;
  isSubmitting = false;
  reservationId: number | null = null;
  vendorQR: string | null = null;
  receiptFile: File | null = null;
  receiptPreview: string | null = null;
  isUploadingReceipt = false;
  orderConfirmed = false;

  // ── Cart (multi-product) flow ────────────────────────────────────────────
  cart: CartItem[] = [];
  cartOpen = false;
  badgePop = false;
  /** 'items' → cart list, 'customer' → customer form inside panel */
  cartPanelStep: 'items' | 'customer' = 'items';
  /** overall cart checkout state (for main page sections) */
  cartStep: 'shopping' | 'payment' | 'done' = 'shopping';
  cartCustomerForm: FormGroup;
  isSubmittingCart = false;
  cartReservationIds: number[] = [];
  cartFailedItems: string[] = [];
  cartTotalOrdered = 0;
  cartTotalAmount = 0;

  // ── Promociones carousel ─────────────────────────────────────────────────
  promociones: { id: number; titulo: string; descripcion: string; imagen: string | null }[] = [];
  carouselIndex = 0;
  private carouselTimer?: any;

  // ── Payment methods ───────────────────────────────────────────────────────
  paymentMethods = [
    { value: 'qr',           label: 'Pago QR' },
    { value: 'transferencia', label: 'Transferencia bancaria' }
  ];

  bolivianDepartments = [
    'Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro',
    'Pando', 'Potosí', 'Santa Cruz', 'Tarija'
  ];

  // ── Cupón ─────────────────────────────────────────────────────────────────
  cuponCodigo = '';
  cuponChecking = false;
  cuponValido: boolean | null = null;
  cuponDescuento = '0';
  cuponError = '';

  // ── Computed ──────────────────────────────────────────────────────────────
  selectedCategory = 'all';
  currentPage = 1;
  readonly pageSize = 12;

  get allowMultipleCart(): boolean {
    return !!this.session?.allow_multiple_cart;
  }

  get products(): any[] {
    const raw: any[] = this.session?.products || [];
    return raw.filter((p: any, idx: number, arr: any[]) =>
      arr.findIndex((x: any) => x.id === p.id) === idx
    );
  }

  get categories(): { id: string; label: string }[] {
    const map = new Map<string, string>();
    this.products.forEach((p: any) => {
      const rawId = p.category_id ?? p.category ?? p.category_name;
      const label = (p.category_name || p.category?.name || '').toString().trim();
      if (rawId !== null && rawId !== undefined && label) {
        map.set(String(rawId), label);
      }
    });
    return [{ id: 'all', label: 'Todas' }, ...Array.from(map.entries()).map(([id, label]) => ({ id, label }))];
  }

  get filteredProducts(): any[] {
    if (this.selectedCategory === 'all') return this.products;
    return this.products.filter((p: any) => String(p.category_id ?? p.category ?? '') === this.selectedCategory);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
  }

  get paginatedProducts(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  get maxStock(): number {
    if (this.selectedVariant) {
      const vs = this.selectedVariant.stock;
      if (vs != null && vs > 0) return vs;
    }
    return this.selectedProduct?.available_quantity ?? this.selectedProduct?.stock ?? 1;
  }

  get variantDetail(): string {
    if (!this.selectedVariant) return '';
    const parts: string[] = [];
    if (this.selectedVariant.size)  parts.push(`Talla ${this.selectedVariant.size}`);
    if (this.selectedVariant.color) parts.push(`Color ${this.selectedVariant.color}`);
    return parts.join(' / ');
  }

  get cartCount(): number {
    return this.cart.reduce((sum, i) => sum + i.quantity, 0);
  }

  get cartTotal(): number {
    return this.cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  }

  get singleProductTotal(): number {
    if (!this.selectedProduct) return 0;
    return this.selectedProduct.price * (this.orderForm.get('quantity')?.value || 1);
  }

  get singleProductTotalWithDiscount(): number {
    return Math.max(0, this.singleProductTotal - this.cuponDescuentoNum);
  }

  get cartTotalWithDiscount(): number {
    return Math.max(0, this.cartTotal - this.cuponDescuentoNum);
  }

  get cuponDescuentoNum(): number {
    return parseFloat(this.cuponDescuento) || 0;
  }

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.orderForm = this.fb.group({
      customer_name:       ['', [Validators.required, Validators.minLength(2)]],
      customer_phone:      ['', [Validators.required, Validators.minLength(7)]],
      shipping_department: [''],
      shipping_description:[''],
      payment_method:      ['qr', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      notes: ['']
    });
    this.cartCustomerForm = this.fb.group({
      customer_name:       ['', [Validators.required, Validators.minLength(2)]],
      customer_phone:      ['', [Validators.required, Validators.minLength(7)]],
      shipping_department: [''],
      shipping_description:[''],
      payment_method:      ['qr', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    this.loadSession();
    this.loadPromociones();
  }

  ngOnDestroy(): void {
    document.documentElement.style.overflow = '';
    document.documentElement.style.height = '';
    document.body.style.overflow = '';
    document.body.style.height = '';
    if (this.carouselTimer) clearInterval(this.carouselTimer);
  }

  private loadPromociones(): void {
    this.http.get<any[]>(`/api/v1/vendors/public/${this.slug}/promociones/`).subscribe({
      next: data => {
        this.promociones = data;
        if (data.length > 1) {
          this.carouselTimer = setInterval(() => this.carouselNext(), 4500);
        }
      },
      error: () => {}
    });
  }

  carouselNext(): void {
    if (!this.promociones.length) return;
    this.carouselIndex = (this.carouselIndex + 1) % this.promociones.length;
  }

  carouselPrev(): void {
    if (!this.promociones.length) return;
    this.carouselIndex = (this.carouselIndex - 1 + this.promociones.length) % this.promociones.length;
  }

  aplicarCupon(total: number): void {
    const code = this.cuponCodigo.trim();
    if (!code) return;
    this.cuponChecking = true;
    this.cuponValido = null;
    this.cuponError = '';
    this.http.get<any>('/api/v1/cupones/public/validar/', {
      params: { vendor_slug: this.vendorSlug || this.slug, codigo: code, total: total.toString() }
    }).subscribe({
      next: res => {
        this.cuponChecking = false;
        this.cuponValido = true;
        this.cuponDescuento = res.descuento_aplicado;
      },
      error: err => {
        this.cuponChecking = false;
        this.cuponValido = false;
        this.cuponDescuento = '0';
        this.cuponError = err.error?.error || 'Cupón inválido o no aplicable';
      }
    });
  }

  limpiarCupon(): void {
    this.cuponCodigo = '';
    this.cuponValido = null;
    this.cuponDescuento = '0';
    this.cuponError = '';
  }

  loadSession(): void {
    this.loading = true;
    this.http.get<any>(`/api/v1/livestreams/public/${this.slug}/`).subscribe({
      next: (data) => {
        this.session = data;
        this.vendorSlug = data.vendor_slug || this.slug;
        this.vendorQR = data.payment_qr_image || null;
        this.loading = false;
        if (data.status !== 'live') {
          this.error = 'Este live no está activo en este momento.';
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Live no encontrado.';
      }
    });
  }

  // ── Product selection ────────────────────────────────────────────────────

  selectProduct(product: any): void {
    if ((product.available_quantity ?? product.stock) === 0) return;
    this.selectedProduct = product;
    this.selectedVariant = null;
    this.orderForm.patchValue({ quantity: 1 });
    this.scrollToId('section-detail');
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.currentPage = 1;
    this.clearSelection();
  }

  goToPage(page: number): void {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
  }

  selectVariant(variant: any): void {
    if (variant.stock === 0) return;
    this.selectedVariant = variant;
    this.orderForm.patchValue({ quantity: 1 });
    if (!this.allowMultipleCart) {
      this.scrollToId('section-form');
    }
  }

  clearSelection(): void {
    this.selectedProduct = null;
    this.selectedVariant = null;
    this.orderForm.patchValue({ quantity: 1 });
  }

  decreaseQty(): void {
    const current = this.orderForm.get('quantity')?.value || 1;
    if (current > 1) this.orderForm.patchValue({ quantity: current - 1 });
  }

  increaseQty(): void {
    const current = this.orderForm.get('quantity')?.value || 1;
    if (current < this.maxStock) this.orderForm.patchValue({ quantity: current + 1 });
  }

  // ── Single-product submit ────────────────────────────────────────────────

  submitOrder(): void {
    if (this.orderForm.invalid || this.isSubmitting || !this.selectedProduct) return;
    if (this.selectedProduct.variants?.length > 0 && !this.selectedVariant) return;
    if (this.cuponCodigo.trim() && this.cuponValido !== true) {
      this.snackBar.open('Validá el cupón antes de confirmar el pedido.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.isSubmitting = true;

    const body: any = {
      customer_name:        this.orderForm.get('customer_name')?.value,
      customer_phone:       this.orderForm.get('customer_phone')?.value,
      shipping_department:  this.normalizeDepartment(this.orderForm.get('shipping_department')?.value),
      shipping_description: this.orderForm.get('shipping_description')?.value,
      quantity:             this.orderForm.get('quantity')?.value,
      notes:                this.orderForm.get('notes')?.value,
      product:              this.selectedProduct.id,
      variant_detail:       this.variantDetail,
      variant_id:           this.selectedVariant?.id || null,
      cupon_codigo:         this.cuponValido === true ? this.cuponCodigo.trim() : '',
    };

    this.http.post<any>(`/api/v1/orders/public/live/${this.slug}/reserve/`, body).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.reservationId = res.id;
        this.scrollToId('section-payment');
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.non_field_errors?.[0]
          || err.error?.detail
          || 'Error al enviar el pedido. Intentá de nuevo.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      }
    });
  }

  onReceiptSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    this.receiptFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.receiptPreview = e.target.result; };
    reader.readAsDataURL(file);
  }

  clearReceipt(): void {
    this.receiptFile = null;
    this.receiptPreview = null;
  }

  submitReceipt(): void {
    if (!this.receiptFile || !this.reservationId) return;
    this.isUploadingReceipt = true;

    const formData = new FormData();
    formData.append('reservation_id', this.reservationId.toString());
    formData.append('payment_method', this.orderForm.get('payment_method')?.value || 'qr');
    formData.append('receipt_image', this.receiptFile);

    this.http.post('/api/v1/payments/public/submit/', formData).subscribe({
      next: () => {
        this.isUploadingReceipt = false;
        this.orderConfirmed = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.isUploadingReceipt = false;
        const msg = err.error?.error || 'Error al enviar el comprobante.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      }
    });
  }

  // ── Cart methods ─────────────────────────────────────────────────────────

  addToCart(): void {
    if (!this.selectedProduct) return;
    if (this.selectedProduct.variants?.length > 0 && !this.selectedVariant) {
      this.snackBar.open('Seleccioná una variante primero', '', { duration: 2000 });
      return;
    }

    const qty = this.orderForm.get('quantity')?.value || 1;
    const existingIdx = this.cart.findIndex(i =>
      i.product.id === this.selectedProduct.id &&
      JSON.stringify(i.variant) === JSON.stringify(this.selectedVariant)
    );

    if (existingIdx >= 0) {
      const maxQ = this.maxStock;
      this.cart[existingIdx].quantity = Math.min(this.cart[existingIdx].quantity + qty, maxQ);
      this.cart = [...this.cart];
    } else {
      this.cart = [...this.cart, {
        product: this.selectedProduct,
        variant: this.selectedVariant,
        variantLabel: this.variantDetail,
        quantity: qty
      }];
    }

    this.clearSelection();
    this.badgePop = true;
    setTimeout(() => { this.badgePop = false; }, 350);
  }

  removeCartItem(index: number): void {
    this.cart.splice(index, 1);
  }

  updateCartQty(index: number, delta: number): void {
    const item = this.cart[index];
    const maxQ = item.variant
      ? item.variant.stock
      : (item.product.available_quantity ?? item.product.stock);
    const newQ = item.quantity + delta;
    if (newQ < 1 || newQ > maxQ) return;
    item.quantity = newQ;
  }

  openCart(): void {
    this.cartPanelStep = 'items';
    this.cartOpen = true;
  }

  closeCart(): void {
    this.cartOpen = false;
  }

  goToCartCustomer(): void {
    this.cartPanelStep = 'customer';
  }

  backToCartItems(): void {
    this.cartPanelStep = 'items';
  }

  submitCartOrders(): void {
    if (this.cartCustomerForm.invalid || this.isSubmittingCart || this.cart.length === 0) return;
    if (this.cuponCodigo.trim() && this.cuponValido !== true) {
      this.snackBar.open('Validá el cupón antes de confirmar los pedidos.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.isSubmittingCart = true;
    this.cartFailedItems = [];

    const name               = this.cartCustomerForm.get('customer_name')?.value;
    const phone              = this.cartCustomerForm.get('customer_phone')?.value;
    const shippingDept       = this.normalizeDepartment(this.cartCustomerForm.get('shipping_department')?.value);
    const shippingDesc       = this.cartCustomerForm.get('shipping_description')?.value;
    const notes              = this.cartCustomerForm.get('notes')?.value;

    const snapshot = [...this.cart];
    const results: (number | null)[] = new Array(snapshot.length).fill(null);
    const failures: string[] = [];
    let remaining = snapshot.length;

    const checkDone = () => {
      remaining--;
      if (remaining > 0) return;

      this.isSubmittingCart = false;
      this.cartReservationIds = results.filter((id): id is number => id !== null);
      this.cartFailedItems = failures;
      this.cartTotalOrdered = this.cartReservationIds.length;

      if (this.cartReservationIds.length > 0) {
        // Capture total before removing successful items from cart
        this.cartTotalAmount = snapshot
          .filter((_, i) => results[i] !== null)
          .reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        if (this.cuponValido === true) {
          this.cartTotalAmount = Math.max(0, this.cartTotalAmount - this.cuponDescuentoNum);
        }
        // Remove only items that were successfully submitted
        this.cart = this.cart.filter((_, i) => results[i] === null);
        this.cartOpen = false;
        this.cartStep = 'payment';
        this.scrollToId('section-cart-payment');
      } else {
        this.snackBar.open('No se pudo procesar ningún pedido. Intentá de nuevo.', 'Cerrar', { duration: 5000 });
        this.cartPanelStep = 'customer';
      }
    };

    snapshot.forEach((item, i) => {
      this.http.post<any>(`/api/v1/orders/public/live/${this.slug}/reserve/`, {
        customer_name:        name,
        customer_phone:       phone,
        shipping_department:  shippingDept,
        shipping_description: shippingDesc,
        quantity:             item.quantity,
        notes:                notes,
        product:              item.product.id,
        variant_detail:       item.variantLabel,
        variant_id:           item.variant?.id || null,
        cupon_codigo:         this.cuponValido === true && i === 0 ? this.cuponCodigo.trim() : '',
      }).subscribe({
        next: (res) => {
          results[i] = res.id;
          checkDone();
        },
        error: (err) => {
          const msg = err.status === 500
            ? 'Error del servidor, intentá de nuevo'
            : (err.error?.non_field_errors?.[0] || err.error?.detail || 'Stock insuficiente');
          failures.push(`${item.product.name}: ${msg}`);
          checkDone();
        }
      });
    });
  }

  submitCartReceipt(): void {
    if (!this.receiptFile || this.cartReservationIds.length === 0) return;
    this.isUploadingReceipt = true;

    const uploads = this.cartReservationIds.map(id => {
      const fd = new FormData();
      fd.append('reservation_id', String(id));
      fd.append('payment_method', this.cartCustomerForm.get('payment_method')?.value || 'qr');
      fd.append('receipt_image', this.receiptFile!);
      return this.http.post('/api/v1/payments/public/submit/', fd);
    });

    forkJoin(uploads).subscribe({
      next: () => {
        this.isUploadingReceipt = false;
        this.cartStep = 'done';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.isUploadingReceipt = false;
        const msg = err.error?.error || 'Error al enviar el comprobante.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      }
    });
  }

  trackByProductId(_: number, item: any): number {
    return item.id;
  }

  private normalizeDepartment(raw: any): string {
    const value = (raw || '').toString().trim();
    if (!value) return '';
    const match = this.bolivianDepartments.find(d => d.toLowerCase() === value.toLowerCase());
    return match || value;
  }

  private scrollToId(id: string): void {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 150);
  }
}
