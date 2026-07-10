import { Component, OnInit, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { PermissionsService } from '../shared/permissions.service';
import { PermisosService } from '../core/services/permisos.service';
import { VendorProfileService } from '../my-store/services/vendor-profile.service';
import { EcommerceOrdersService } from '../ecommerce-orders/ecommerce-orders.service';

type JwtPermKey =
  | 'dashboard' | 'expenses' | 'pos' | 'arqueos' | 'ventas_pos' | 'devoluciones'
  | 'conteos' | 'conteos_control' | 'transferencias' | 'almacen' | 'inventory'
  | 'compras' | 'proveedores' | 'products' | 'categories' | 'team' | 'configuracion'
  | 'my_store' | 'live_sessions' | 'orders' | 'payments' | 'ecommerce_orders';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  jwtPerm: JwtPermKey;
  moduloApi: string;
  /** MODO SIMPLE - ocultar en sidebar cuando modo_simple=true */
  ocultarEnModoSimple?: boolean;
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isMobile = false;
  vendorName = 'Mi Tienda';
  logoUrl: string | null = null;
  pendingEcomOrders = 0;
  /** MODO SIMPLE - oculta módulos avanzados del sidebar */
  modoSimple = false;

  private allNavItems: NavItem[] = [
    { label: 'Dashboard',       icon: 'dashboard',           route: '/dashboard',              jwtPerm: 'dashboard',        moduloApi: 'dashboard'        },
    { label: 'Gastos',          icon: 'receipt_long',        route: '/gastos',                 jwtPerm: 'expenses',         moduloApi: 'expenses'         },
    { label: 'Vender',          icon: 'point_of_sale',       route: '/vendor/pos',             jwtPerm: 'pos',              moduloApi: 'pos'              },
    { label: 'Arqueos Caja',    icon: 'calculate',           route: '/vendor/arqueos',         jwtPerm: 'arqueos',          moduloApi: 'arqueos'          },
    { label: 'Ventas POS',      icon: 'receipt',             route: '/vendor/ventas',          jwtPerm: 'ventas_pos',       moduloApi: 'ventas_pos'       },
    { label: 'Devoluciones',    icon: 'assignment_return',   route: '/devoluciones',           jwtPerm: 'devoluciones',     moduloApi: 'devoluciones',     ocultarEnModoSimple: true },
    { label: 'Conteo físico',   icon: 'fact_check',          route: '/almacen/conteos',        jwtPerm: 'conteos',          moduloApi: 'conteos',          ocultarEnModoSimple: true },
    { label: 'Control conteos', icon: 'verified_user',       route: '/almacen/conteos-control', jwtPerm: 'conteos_control', moduloApi: 'conteos_control',  ocultarEnModoSimple: true },
    { label: 'Transferencias',  icon: 'swap_horiz',          route: '/almacen/transferencias', jwtPerm: 'transferencias',   moduloApi: 'transferencias',   ocultarEnModoSimple: true },
    { label: 'Almacén',         icon: 'warehouse',           route: '/almacen',                jwtPerm: 'almacen',          moduloApi: 'almacen'          },
    { label: 'Inventario',      icon: 'inventory',           route: '/inventory',              jwtPerm: 'inventory',        moduloApi: 'inventory'        },
    { label: 'Compras',         icon: 'shopping_basket',     route: '/compras',                jwtPerm: 'compras',          moduloApi: 'compras',          ocultarEnModoSimple: true },
    { label: 'Proveedores',     icon: 'business',            route: '/compras/proveedores',    jwtPerm: 'proveedores',      moduloApi: 'proveedores'      },
    { label: 'Productos',       icon: 'inventory_2',         route: '/products',               jwtPerm: 'products',         moduloApi: 'products'         },
    { label: 'Categorías',      icon: 'category',            route: '/categories',             jwtPerm: 'categories',       moduloApi: 'categories'       },
    { label: 'Equipo',          icon: 'group',               route: '/team',                   jwtPerm: 'team',             moduloApi: 'team'             },
    { label: 'Configuración',   icon: 'settings',            route: '/configuracion',          jwtPerm: 'configuracion',    moduloApi: 'configuracion'    },
    { label: 'Mi Tienda',       icon: 'storefront',          route: '/my-store',               jwtPerm: 'my_store',         moduloApi: 'my_store'         },
    { label: 'Lives',           icon: 'live_tv',             route: '/live-sessions',          jwtPerm: 'live_sessions',    moduloApi: 'livestream'       },
    { label: 'Pedidos',         icon: 'shopping_cart',       route: '/orders',                 jwtPerm: 'orders',           moduloApi: 'pedidos'          },
    { label: 'Pagos',           icon: 'credit_card',         route: '/payments',               jwtPerm: 'payments',         moduloApi: 'pagos',            ocultarEnModoSimple: true },
    { label: 'Pedidos Web',     icon: 'shopping_bag',        route: '/ecommerce-orders',       jwtPerm: 'ecommerce_orders', moduloApi: 'ecommerce_orders', ocultarEnModoSimple: true },
  ];

  private jwtPermOk(key: JwtPermKey): boolean {
    const p = this.permissions;
    switch (key) {
      case 'dashboard':        return p.canViewDashboard();
      case 'expenses':         return p.canUseExpenses();
      case 'pos':              return p.canUsePOS();
      case 'arqueos':          return p.canViewArqueos();
      case 'ventas_pos':       return p.canViewVentasPos();
      case 'devoluciones':     return p.canViewDevoluciones();
      case 'conteos':          return p.canViewConteos();
      case 'conteos_control':  return p.canViewConteosControl();
      case 'transferencias':   return p.canViewTransferencias();
      case 'almacen':          return p.canViewAlmacen();
      case 'inventory':        return p.canViewInventory();
      case 'compras':          return p.canViewCompras();
      case 'proveedores':      return p.canViewProveedores();
      case 'products':         return p.canViewProducts();
      case 'categories':       return p.canViewCategories();
      case 'team':             return p.canManageTeam();
      case 'configuracion':    return p.canUseSettings();
      case 'my_store':         return p.canViewMyStore();
      case 'live_sessions':    return p.canViewLiveSessions();
      case 'orders':           return p.canViewOrders();
      case 'payments':         return p.canConfirmPayments();
      case 'ecommerce_orders': return p.canViewEcommerceOrders();
      default:                 return true;
    }
  }

  private seeModuleViaApi(moduloApi: string): boolean {
    if (this.permisosService.permisos) {
      return this.permisosService.puede(moduloApi);
    }
    return true;
  }

  get navItems(): NavItem[] {
    return this.allNavItems.filter(item => {
      if (this.modoSimple && item.ocultarEnModoSimple) return false;
      if (!this.jwtPermOk(item.jwtPerm)) return false;
      return this.seeModuleViaApi(item.moduloApi);
    });
  }

  /** MODO SIMPLE - visibilidad de ítem en sidebar */
  showNavItem(item: NavItem): boolean {
    return !(this.modoSimple && item.ocultarEnModoSimple);
  }

  private applyModoSimpleFromPayload(payload: Record<string, unknown> | null): void {
    if (!payload) return;
    this.modoSimple = payload['modo_simple'] === true;
  }

  constructor(
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    private authService: AuthService,
    public permissions: PermissionsService,
    public permisosService: PermisosService,
    private vendorProfileService: VendorProfileService,
    private ecomOrdersService: EcommerceOrdersService
  ) {}

  ngOnInit(): void {
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .subscribe(result => {
        this.isMobile = result.matches;
      });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile && this.sidenav) {
          this.sidenav.close();
        }
      });

    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.vendorName = payload.store_name || payload.username || payload.email || 'Mi Tienda';
        this.applyModoSimpleFromPayload(payload);
      } catch {
        // keep default
      }
    }

    if (this.authService.isAuthenticated()) {
      this.permisosService.cargarPermisos().subscribe({
        next: (permisos) => {
          this.modoSimple = permisos?.modo_simple ?? this.modoSimple;
        },
        error: () => {},
      });
    }

    this.ecomOrdersService.getPendingCount().subscribe({
      next: (res) => { this.pendingEcomOrders = res.count; },
      error: () => {}
    });

    this.vendorProfileService.getProfile().subscribe({
      next: (profile) => {
        if (profile.logo) {
          const base = this.vendorProfileService.mediaBase;
          let url = profile.logo.startsWith('http') ? profile.logo : `${base}${profile.logo}`;
          if (url.startsWith('http://')) {
            url = 'https://' + url.slice(7);
          }
          this.logoUrl = url;
        }
        this.vendorName = profile.nombre_tienda || this.vendorName;
      },
      error: () => { /* keep JWT-based name */ }
    });
  }

  isActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }
}
