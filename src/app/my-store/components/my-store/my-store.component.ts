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
  selectedLogoFile: File | null = null;
  logoPreviewUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      store_name:  ['', Validators.required],
      phone:       [''],
      description: ['']
    });

    this.loadProfile();
  }

  loadProfile(): void {
    this.vendorProfileService.getProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.form.patchValue({
          store_name:  profile.nombre_tienda,
          phone:       profile.whatsapp,
          description: profile.descripcion
        });
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar el perfil', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onLogoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedLogoFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => { this.logoPreviewUrl = e.target?.result as string; };
      reader.readAsDataURL(this.selectedLogoFile);
    }
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
    formData.append('whatsapp',      this.form.value.phone       || '');
    formData.append('descripcion',   this.form.value.description || '');
    if (this.selectedLogoFile) {
      formData.append('logo', this.selectedLogoFile);
    }
    if (this.selectedQrFile) {
      formData.append('payment_qr_image', this.selectedQrFile);
    }

    this.vendorProfileService.updateProfile(formData).subscribe({
      next: (updated) => {
        this.profile = updated;
        this.selectedLogoFile = null;
        this.logoPreviewUrl   = null;
        this.selectedQrFile   = null;
        this.qrPreviewUrl     = null;
        this.snackBar.open('Perfil actualizado correctamente', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: (err) => {
        this.snackBar.open('Error al guardar el perfil', 'Cerrar', { duration: 4000 });
        this.saving = false;
      }
    });
  }

  /** URL del logo a mostrar: preview local > imagen guardada */
  get currentLogoUrl(): string | null {
    return this.logoPreviewUrl ?? this.profile?.logo ?? null;
  }

  /** Devuelve la URL de la imagen QR a mostrar: preview local > imagen guardada */
  get currentQrUrl(): string | null {
    return this.qrPreviewUrl ?? this.profile?.payment_qr_image ?? null;
  }
}
