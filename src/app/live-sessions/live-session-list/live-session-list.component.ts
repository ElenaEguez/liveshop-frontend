import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LiveSession, LiveSessionService } from '../services/live-session.service';
import { LiveSessionFormComponent } from '../live-session-form/live-session-form.component';

@Component({
  selector: 'app-live-session-list',
  templateUrl: './live-session-list.component.html',
  styleUrls: ['./live-session-list.component.css']
})
export class LiveSessionListComponent implements OnInit {
  sessions: LiveSession[] = [];
  displayedColumns = ['title', 'platform', 'scheduled_at', 'status', 'actions'];

  constructor(
    private liveSessionService: LiveSessionService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.liveSessionService.getSessions().subscribe(
      sessions => this.sessions = sessions,
      error => console.error('Error loading sessions:', error)
    );
  }

  openNewSessionForm(): void {
    const dialogRef = this.dialog.open(LiveSessionFormComponent, { width: '520px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadSessions();
    });
  }

  editSession(session: LiveSession): void {
    const dialogRef = this.dialog.open(LiveSessionFormComponent, {
      width: '520px',
      data: { session }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadSessions();
    });
  }

  goToDetail(session: LiveSession): void {
    this.router.navigate(['/live-sessions', session.id]);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      scheduled: 'Programada',
      live: 'En vivo',
      ended: 'Finalizada'
    };
    return labels[status] ?? status;
  }

  getStatusBg(status: string): string {
    const map: Record<string, string> = {
      scheduled: '#fef9c3',
      live: '#dcfce7',
      ended: '#f3f4f6'
    };
    return map[status] ?? '#f3f4f6';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      scheduled: '#854d0e',
      live: '#166534',
      ended: '#6b7280'
    };
    return map[status] ?? '#6b7280';
  }

  getPlatformLabel(platform: string): string {
    const map: Record<string, string> = {
      tiktok: 'TikTok',
      facebook: 'Facebook',
      instagram: 'Instagram'
    };
    return map[platform] ?? platform;
  }

  getActionLabel(status: string): string {
    return status === 'scheduled' ? 'Iniciar' : 'Ver';
  }

  getActionIcon(status: string): string {
    return status === 'scheduled' ? 'play_circle' : 'visibility';
  }
}
