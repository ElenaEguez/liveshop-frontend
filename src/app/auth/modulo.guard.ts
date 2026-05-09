import { Injectable } from '@angular/core';
import {
  CanActivate, ActivatedRouteSnapshot,
  RouterStateSnapshot, Router, UrlTree,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PermisosService } from '../core/services/permisos.service';

@Injectable({ providedIn: 'root' })
export class ModuloGuard implements CanActivate {

  constructor(
    private permisosService: PermisosService,
    private router: Router
  ) {}

  private evaluate(modulo: string, accion: 'ver' | 'operar'): boolean | UrlTree {
    if (!this.permisosService.suscripcionActiva) {
      return this.router.parseUrl('/suscripcion-vencida');
    }
    if (this.permisosService.puede(modulo, accion)) {
      return true;
    }
    return this.router.parseUrl('/sin-permiso');
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const modulo = route.data?.['modulo'] as string;
    const accion = (route.data?.['accion'] as 'ver' | 'operar') || 'ver';

    if (!modulo) {
      return of(true);
    }

    if (this.permisosService.permisos) {
      return of(this.evaluate(modulo, accion));
    }

    return this.permisosService.cargarPermisos().pipe(
      map(() => this.evaluate(modulo, accion)),
      catchError(() => of(this.router.parseUrl('/sin-permiso')))
    );
  }
}
