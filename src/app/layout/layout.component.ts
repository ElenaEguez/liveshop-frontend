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

type NavPermission = 'always' | 'products' | 'categories' | 'inventory' | 'live_sessions' | 'my_store' | 'orders' | 'payments' | 'team' | 'dashboard' | 'pos' | 'warehouse' | 'expenses' | 'settings' | 'ecommerce_orders' | 'compras';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  permission: NavPermission;
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

  private allNavItems: NavItem[] = [
    { label: 'Dashboard',  icon: 'dashboard',      route: '/dashboard',     permission: 'dashboard'    },
    { label: 'Vender',         icon: 'point_of_sale',  route: '/vendor/pos',        permission: 'pos'       },
    { label: 'Ventas POS',    icon: 'receipt',        route: '/vendor/ventas',     permission: 'pos'       },
    { label: 'Devoluciones', icon: 'assignment_return', route: '/devoluciones', permission: 'pos' },
    { label: 'Arqueos Caja',  icon: 'calculate',      route: '/vendor/arqueos',    permission: 'pos'       },
    { label: 'Almacén',       icon: 'warehouse',      route: '/almacen',         permission: 'warehouse' },
    { label: 'Transferencias', icon: 'swap_horiz',   route: '/almacen/transferencias', permission: 'warehouse' },
    { label: 'Conteo físico', icon: 'fact_check',    route: '/almacen/conteos', permission: 'inventory' },
    { label: 'Gastos',        icon: 'receipt_long',   route: '/gastos',          permission: 'expenses'  },
    { label: 'Compras',       icon: 'shopping_basket', route: '/compras',        permission: 'compras'   },
    { label: 'Proveedores',   icon: 'business',         route: '/compras/proveedores', permission: 'compras' },
    { label: 'Configuración', icon: 'settings',       route: '/configuracion',   permission: 'settings'  },
    { label: 'Productos',     icon: 'inventory_2',    route: '/products',        permission: 'products'  },
    { label: 'Categorías', icon: 'category',       route: '/categories',    permission: 'categories'   },
    { label: 'Inventario', icon: 'warehouse',      route: '/inventory',     permission: 'inventory'    },
    { label: 'Lives',      icon: 'live_tv',        route: '/live-sessions', permission: 'live_sessions'},
    { label: 'Pedidos',    icon: 'shopping_cart',  route: '/orders',        permission: 'orders'       },
    { label: 'Pagos',      icon: 'credit_card',    route: '/payments',      permission: 'payments'     },
    { label: 'Mi Tienda',  icon: 'storefront',     route: '/my-store',      permission: 'my_store'     },
    { label: 'Equipo',     icon: 'group',          route: '/team',          permission: 'team'         },
    { label: 'Pedidos Web', icon: 'shopping_bag',  route: '/ecommerce-orders', permission: 'ecommerce_orders' },
  ];

  private moduloApiForItem(item: NavItem): string | null {
    if (item.route === '/compras/proveedores') {
      return 'compras';
    }
    if (item.route === '/devoluciones') {
      return 'pos';
    }
    const map: Partial<Record<NavPermission, string>> = {
      dashboard: 'reportes',
      pos: 'pos',
      warehouse: 'inventario',
      inventory: 'inventario',
      expenses: 'reportes',
      compras: 'compras',
      settings: 'configuracion',
      products: 'productos',
      categories: 'productos',
      live_sessions: 'livestream',
      orders: 'pedidos',
      payments: 'pagos',
      my_store: 'configuracion',
      team: 'configuracion',
      ecommerce_orders: 'reportes',
    };
    return map[item.permission] ?? null;
  }

  /**
   * Mientras cargan permisos API, JWT (PermissionsService) ya filtró con legacyOk;
   * puede() solo aplica cuando hay snapshot de MisPermisos.
   */
  private seeModuleViaApi(moduloApi: string): boolean {
    if (this.permisosService.permisos) {
      return this.permisosService.puede(moduloApi);
    }
    return true;
  }

  get navItems(): NavItem[] {
    const p = this.permissions;
    return this.allNavItems.filter(item => {
      let legacyOk: boolean;
      switch (item.permission) {
        case 'always':       legacyOk = true; break;
        case 'products':     legacyOk = p.canViewProducts(); break;
        case 'categories':   legacyOk = p.canViewCategories(); break;
        case 'inventory':    legacyOk = p.canViewInventory(); break;
        case 'live_sessions':legacyOk = p.canViewLiveSessions(); break;
        case 'orders':       legacyOk = p.canViewOrders(); break;
        case 'payments':     legacyOk = p.canConfirmPayments(); break;
        case 'my_store':     legacyOk = p.canViewMyStore(); break;
        case 'team':         legacyOk = p.canManageTeam(); break;
        case 'dashboard':    legacyOk = p.canViewDashboard(); break;
        case 'pos':          legacyOk = p.canUsePOS(); break;
        case 'warehouse':    legacyOk = p.canUseWarehouse(); break;
        case 'expenses':     legacyOk = p.canUseExpenses(); break;
        case 'compras':      legacyOk = p.canViewCompras(); break;
        case 'settings':     legacyOk = p.canUseSettings(); break;
        case 'ecommerce_orders': legacyOk = p.canViewMyStore() || p.canViewOrders(); break;
        default:                 legacyOk = true;
      }
      if (!legacyOk) return false;
      const mk = this.moduloApiForItem(item);
      if (!mk) return true;
      return this.seeModuleViaApi(mk);
    });
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

    // Read store name from JWT payload
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.vendorName = payload.store_name || payload.username || payload.email || 'Mi Tienda';
      } catch {
        // keep default
      }
    }

    if (this.authService.isAuthenticated()) {
      this.permisosService.cargarPermisos().subscribe({ error: () => {} });
    }

    // Load pending ecommerce orders count
    this.ecomOrdersService.getPendingCount().subscribe({
      next: (res) => { this.pendingEcomOrders = res.count; },
      error: () => {}
    });

    // Load logo from API
    this.vendorProfileService.getProfile().subscribe({
      next: (profile) => {
        if (profile.logo) {
          const base = this.vendorProfileService.mediaBase;
          this.logoUrl = profile.logo.startsWith('http') ? profile.logo : `${base}${profile.logo}`;
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
