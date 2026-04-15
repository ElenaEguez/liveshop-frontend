import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VendorProfile {
  id: number;
  nombre_tienda: string;
  slug: string;
  logo: string | null;
  descripcion: string | null;
  whatsapp: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  payment_qr_image: string | null;
  payment_instructions: string | null;
  accepted_payment_methods: string | null;
  inventory_method: 'peps' | 'ueps' | 'promedio';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class VendorProfileService {
  private apiUrl = `${environment.apiUrl}/vendors/profile/`;
  readonly mediaBase = environment.apiUrl.replace('/api/v1', '');

  constructor(private http: HttpClient) {}

  getProfile(): Observable<VendorProfile> {
    return this.http.get<VendorProfile>(this.apiUrl);
  }

  /** Usa FormData para soportar upload de imagen del QR.
   *  NO establecer Content-Type manualmente — Angular lo hace automáticamente. */
  updateProfile(data: FormData): Observable<VendorProfile> {
    return this.http.put<VendorProfile>(this.apiUrl, data);
  }
}
