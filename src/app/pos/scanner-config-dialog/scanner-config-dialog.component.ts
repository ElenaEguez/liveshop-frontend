import {
  Component, OnDestroy, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-scanner-config-dialog',
  templateUrl: './scanner-config-dialog.component.html',
  styleUrls: ['./scanner-config-dialog.component.scss'],
})
export class ScannerConfigDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  selectedTab = 0;
  cameraError = '';
  cameraActive = false;

  private stream: MediaStream | null = null;
  private animFrame: number | null = null;
  private canvasCtx!: CanvasRenderingContext2D | null;

  // BrowserMultiFormatReader loaded lazily to avoid SSR issues
  private reader: any = null;

  constructor(private dialogRef: MatDialogRef<ScannerConfigDialogComponent>) {}

  ngAfterViewInit(): void {}

  onTabChange(index: number): void {
    this.selectedTab = index;
    if (index !== 0) {
      this.stopCamera();
    }
  }

  async startCamera(): Promise<void> {
    this.cameraError = '';
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser') as any;
      this.reader = new BrowserMultiFormatReader();

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      this.videoEl.nativeElement.srcObject = this.stream;
      await this.videoEl.nativeElement.play();
      this.cameraActive = true;
      this.scanLoop();
    } catch (err: any) {
      this.cameraError =
        err?.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilítalo en el navegador.'
          : 'No se pudo acceder a la cámara: ' + (err?.message || err);
      this.cameraActive = false;
    }
  }

  private scanLoop(): void {
    if (!this.cameraActive || !this.reader) return;
    const video = this.videoEl?.nativeElement;
    if (!video || video.readyState < 2) {
      this.animFrame = requestAnimationFrame(() => this.scanLoop());
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    this.reader
      .decodeFromCanvas(canvas)
      .then((result: any) => {
        const text: string = result?.getText?.() ?? '';
        if (text) {
          this.stopCamera();
          this.dialogRef.close(text);
        } else {
          this.animFrame = requestAnimationFrame(() => this.scanLoop());
        }
      })
      .catch(() => {
        this.animFrame = requestAnimationFrame(() => this.scanLoop());
      });
  }

  stopCamera(): void {
    this.cameraActive = false;
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  close(): void {
    this.stopCamera();
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
