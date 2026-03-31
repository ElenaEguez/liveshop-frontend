import { Component, OnInit, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { PermissionsService } from '../shared/permissions.service';
import { VendorProfileService } from '../my-store/services/vendor-profile.service';
import { EcommerceOrdersService } from '../ecommerce-orders/ecommerce-orders.service';

type NavPermission = 'always' | 'products' | 'categories' | 'inventory' | 'live_sessions' | 'my_store' | 'orders' | 'payments' | 'team' | 'dashboard' | 'pos' | 'warehouse' | 'expenses' | 'settings' | 'ecommerce_orders';

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
    { label: 'Arqueos Caja',  icon: 'calculate',      route: '/vendor/arqueos',    permission: 'pos'       },
    { label: 'Almacén',       icon: 'warehouse',      route: '/almacen',         permission: 'warehouse' },
    { label: 'Gastos',        icon: 'receipt_long',   route: '/gastos',          permission: 'expenses'  },
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

  get navItems(): NavItem[] {
    const p = this.permissions;
    return this.allNavItems.filter(item => {
      switch (item.permission) {
        case 'always':       return true;
        case 'products':     return p.canViewProducts();
        case 'categories':   return p.canViewCategories();
        case 'inventory':    return p.canViewInventory();
        case 'live_sessions':return p.canViewLiveSessions();
        case 'orders':       return p.canViewOrders();
        case 'payments':     return p.canConfirmPayments();
        case 'my_store':     return p.canViewMyStore();
        case 'team':         return p.canManageTeam();
        case 'dashboard':    return p.canViewDashboard();
        case 'pos':          return p.canUsePOS();
        case 'warehouse':    return p.canUseWarehouse();
        case 'expenses':     return p.canUseExpenses();
        case 'settings':        return p.canUseSettings();
        case 'ecommerce_orders': return p.canViewMyStore() || p.canViewOrders();
        default:                 return true;
      }
    });
  }

  constructor(
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    private authService: AuthService,
    public permissions: PermissionsService,
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
