import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LiveSession, LiveSessionService } from '../services/live-session.service';

@Component({
  selector: 'app-live-session-form',
  templateUrl: './live-session-form.component.html',
  styleUrls: ['./live-session-form.component.scss']
})
export class LiveSessionFormComponent {
  form: FormGroup;
  saving = false;
  isEdit: boolean;
  selectedQrFile: File | null = null;
  qrPreview: string | null = null;
  currentQrUrl: string | null = null;

  platforms = [
    { value: 'tiktok', label: 'TikTok' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' }
  ];

  constructor(
    private fb: FormBuilder,
    private liveSessionService: LiveSessionService,
    private dialogRef: MatDialogRef<LiveSessionFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { session?: LiveSession }
  ) {
    const s = data?.session;
    this.isEdit = !!s;
    this.currentQrUrl = s?.payment_qr_image || null;

    const scheduledAt = s?.scheduled_at
      ? s.scheduled_at.substring(0, 16)
      : '';

    this.form = this.fb.group({
      title: [s?.title ?? '', Validators.required],
      platform: [s?.platform ?? '', Validators.required],
      scheduled_at: [scheduledAt, Validators.required],
      description: [s?.description ?? ''],
      stream_url: [s?.stream_url ?? ''],
      payment_instructions: [s?.payment_instructions ?? ''],
      allow_multiple_cart: [s?.allow_multiple_cart ?? false]
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

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;

    const values = { ...this.form.value };
    if (values.scheduled_at && !/T\d{2}:\d{2}:\d{2}/.test(values.scheduled_at)) {
      values.scheduled_at += ':00';
    }

    let payload: FormData | typeof values;
    if (this.selectedQrFile) {
      payload = new FormData();
      Object.keys(values).forEach(k => (payload as FormData).append(k, values[k] ?? ''));
      (payload as FormData).append('payment_qr_image', this.selectedQrFile);
    } else {
      payload = values;
    }

    const request = this.isEdit
      ? this.liveSessionService.updateSession(this.data.session!.id!, payload)
      : this.liveSessionService.createSession(payload);

    request.subscribe(
      () => this.dialogRef.close(true),
      (error: any) => {
        console.error('Error saving session:', error);
        this.saving = false;
      }
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
