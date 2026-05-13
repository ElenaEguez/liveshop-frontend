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

  /** Acceso si tiene al menos uno de los módulos (p. ej. inventario o almacén). */
  private evaluateAny(modulos: string[], accion: 'ver' | 'operar'): boolean | UrlTree {
    if (!this.permisosService.suscripcionActiva) {
      return this.router.parseUrl('/suscripcion-vencida');
    }
    const ok = modulos.some(m => this.permisosService.puede(m, accion));
    if (ok) {
      return true;
    }
    return this.router.parseUrl('/sin-permiso');
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const modulosAny = route.data?.['modulos'] as string[] | undefined;
    const modulo = route.data?.['modulo'] as string;
    const accion = (route.data?.['accion'] as 'ver' | 'operar') || 'ver';

    if (modulosAny?.length) {
      if (this.permisosService.permisos) {
        return of(this.evaluateAny(modulosAny, accion));
      }
      return this.permisosService.cargarPermisos().pipe(
        map(() => this.evaluateAny(modulosAny, accion)),
        catchError(() => of(this.router.parseUrl('/sin-permiso')))
      );
    }

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
