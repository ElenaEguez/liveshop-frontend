import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment-settings',
  templateUrl: './payment-settings.component.html',
  styleUrls: ['./payment-settings.component.css']
})
export class PaymentSettingsComponent implements OnInit {
  form: FormGroup;
  loading = true;
  saving = false;
  selectedQrFile: File | null = null;
  currentQrUrl: string | null = null;
  qrPreview: string | null = null;

  private profileUrl = `${environment.apiUrl}/vendors/profile/`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      payment_instructions: [''],
      accepted_payment_methods: ['']
    });
  }

  ngOnInit(): void {
    this.http.get<any>(this.profileUrl).subscribe({
      next: (data) => {
        this.form.patchValue({
          payment_instructions: data.payment_instructions || '',
          accepted_payment_methods: data.accepted_payment_methods || ''
        });
        this.currentQrUrl = data.payment_qr_image || null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al cargar el perfil.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  onQrSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.selectedQrFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => this.qrPreview = e.target.result;
    reader.readAsDataURL(file);
  }

  save(): void {
    this.saving = true;
    const formData = new FormData();
    formData.append('payment_instructions', this.form.get('payment_instructions')?.value || '');
    formData.append('accepted_payment_methods', this.form.get('accepted_payment_methods')?.value || '');
    if (this.selectedQrFile) {
      formData.append('payment_qr_image', this.selectedQrFile);
    }

    this.http.put<any>(this.profileUrl, formData).subscribe({
      next: (data) => {
        this.saving = false;
        this.currentQrUrl = data.payment_qr_image || null;
        this.selectedQrFile = null;
        this.qrPreview = null;
        this.snackBar.open('Configuración de pago guardada.', 'OK', { duration: 3000 });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Error al guardar. Intentá de nuevo.', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
