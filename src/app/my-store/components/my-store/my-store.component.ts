import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VendorProfile, VendorProfileService } from '../../services/vendor-profile.service';

@Component({
  selector: 'app-my-store',
  templateUrl: './my-store.component.html',
  styleUrls: ['./my-store.component.css']
})
export class MyStoreComponent implements OnInit {
  form!: FormGroup;
  profile: VendorProfile | null = null;
  loading = true;
  saving = false;
  selectedQrFile: File | null = null;
  qrPreviewUrl: string | null = null;

  private originalSlug = '';
  private slugManualEdit = false;

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      store_name:  ['', Validators.required],
      slug:        ['', [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)]],
      phone:       [''],
      description: ['']
    });

    // Auto-generate slug from store_name unless user manually edited it
    this.form.get('store_name')!.valueChanges.subscribe((val: string) => {
      if (!this.slugManualEdit && val) {
        this.form.get('slug')!.setValue(this.slugify(val), { emitEvent: false });
      }
    });

    // Detect manual slug edits
    this.form.get('slug')!.valueChanges.subscribe(() => {
      this.slugManualEdit = true;
    });

    this.loadProfile();
  }

  private slugify(text: string): string {
    return (text ?? '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  resetSlugFromName(): void {
    this.slugManualEdit = false;
    this.form.get('slug')!.setValue(
      this.slugify(this.form.get('store_name')!.value || ''), { emitEvent: false }
    );
  }

  loadProfile(): void {
    this.vendorProfileService.getProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.originalSlug = profile.slug;
        this.slugManualEdit = true;   // don't override on initial patchValue
        this.form.patchValue({
          store_name:  profile.nombre_tienda,
          slug:        profile.slug,
          phone:       profile.whatsapp,
          description: profile.descripcion
        });
        this.slugManualEdit = false;  // reset after initial load
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar el perfil', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onQrFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedQrFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.qrPreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedQrFile);
    }
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;

    const formData = new FormData();
    formData.append('nombre_tienda', this.form.value.store_name);
    formData.append('slug',          this.form.value.slug);
    formData.append('whatsapp',      this.form.value.phone       || '');
    formData.append('descripcion',   this.form.value.description || '');
    if (this.selectedQrFile) {
      formData.append('payment_qr_image', this.selectedQrFile);
    }

    this.vendorProfileService.updateProfile(formData).subscribe({
      next: (updated) => {
        const slugChanged = updated.slug !== this.originalSlug;
        this.profile = updated;
        this.originalSlug = updated.slug;
        this.selectedQrFile = null;
        this.qrPreviewUrl   = null;

        if (slugChanged) {
          this.snackBar.open(
            `Perfil actualizado. Tu nueva URL: /${updated.slug}`,
            'Cerrar',
            { duration: 6000 }
          );
        } else {
          this.snackBar.open('Perfil actualizado correctamente', 'Cerrar', { duration: 3000 });
        }
        this.saving = false;
      },
      error: (err) => {
        const slugErr = err.error?.slug?.[0];
        const msg = slugErr
          ? `Slug inválido: ${slugErr}`
          : 'Error al guardar el perfil';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        this.saving = false;
      }
    });
  }

  /** Devuelve la URL de la imagen QR a mostrar: preview local > imagen guardada */
  get currentQrUrl(): string | null {
    return this.qrPreviewUrl ?? this.profile?.payment_qr_image ?? null;
  }
}
