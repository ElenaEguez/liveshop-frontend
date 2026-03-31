import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { DashboardService, DashboardData } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  sidebarOpen = true;
  vendorName = 'Tienda Demo'; // TODO: obtener del backend
  storeImage = 'https://via.placeholder.com/40'; // TODO: obtener del backend

  dashboardData: DashboardData = {
    total_active_products: 0,
    monthly_sales: 0,
    pending_orders: 0,
    next_live: null
  };

  menuItems = [
    { label: 'Dashboard',  icon: 'dashboard',     route: '/dashboard'     },
    { label: 'Productos',  icon: 'inventory_2',   route: '/products'      },
    { label: 'Categorías', icon: 'category',      route: '/categories'    },
    { label: 'Inventario', icon: 'warehouse',     route: '/inventory'     },
    { label: 'Lives',      icon: 'live_tv',       route: '/live-sessions' },
    { label: 'Pedidos',    icon: 'shopping_cart', route: '/orders'        },
    { label: 'Pagos',      icon: 'credit_card',   route: '/payments'      },
    { label: 'Mi Tienda',  icon: 'store',         route: '/my-store'      }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.loadDashboardData();
    // TODO: cargar datos del vendedor
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    if (window.innerWidth < 768) {
      this.sidebarOpen = false;
    } else {
      this.sidebarOpen = true;
    }
  }

  loadDashboardData(): void {
    this.dashboardService.getDashboardData().subscribe(
      data => {
        this.dashboardData = data;
      },
      error => {
        console.error('Error loading dashboard data', error);
      }
    );
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route;
  }
}