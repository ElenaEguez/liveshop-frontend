import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { ModuloGuard } from './auth/modulo.guard';
import { LayoutComponent } from './layout/layout.component';
import { SinPermisoComponent } from './shared/components/sin-permiso/sin-permiso.component';
import { SuscripcionVencidaComponent } from './shared/components/suscripcion-vencida/suscripcion-vencida.component';

const routes: Routes = [
  { path: 'sin-permiso', component: SinPermisoComponent },
  { path: 'suscripcion-vencida', component: SuscripcionVencidaComponent },

  // Rutas públicas (sin layout)
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'public',
    loadChildren: () => import('./public/public.module').then(m => m.PublicModule)
  },

  // Rutas protegidas (con layout shell persistente)
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'products',
        loadChildren: () => import('./products/products.module').then(m => m.ProductsModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'productos' }
      },
      {
        path: 'categories',
        loadChildren: () => import('./categories/categories.module').then(m => m.CategoriesModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'productos' }
      },
      {
        path: 'inventory',
        loadChildren: () => import('./inventory/inventory.module').then(m => m.InventoryModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'inventario' }
      },
      {
        path: 'live-sessions',
        loadChildren: () => import('./live-sessions/live-sessions.module').then(m => m.LiveSessionsModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'livestream' }
      },
      {
        path: 'orders',
        loadChildren: () => import('./orders/orders.module').then(m => m.OrdersModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'pedidos' }
      },
      {
        path: 'payments',
        loadChildren: () => import('./payments/payments.module').then(m => m.PaymentsModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'pagos' }
      },
      {
        path: 'my-store',
        loadChildren: () => import('./my-store/my-store.module').then(m => m.MyStoreModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'configuracion' }
      },
      {
        path: 'team',
        loadChildren: () => import('./team/team.module').then(m => m.TeamModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'team' }
      },
      {
        path: 'vendor',
        loadChildren: () => import('./pos/pos.module').then(m => m.PosModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'pos' }
      },
      {
        path: 'devoluciones',
        loadChildren: () =>
          import('./devoluciones/devoluciones.module').then(
            (m) => m.DevolucionesModule
          ),
        canActivate: [AuthGuard, ModuloGuard],
        data: { modulo: 'pos', accion: 'operar' },
      },
      {
        path: 'almacen',
        loadChildren: () => import('./warehouse/warehouse.module').then(m => m.WarehouseModule),
        canActivate: [ModuloGuard],
        data: { modulos: ['inventario', 'almacen'] }
      },
      {
        path: 'gastos',
        loadChildren: () => import('./expenses/expenses.module').then(m => m.ExpensesModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'reportes' }
      },
      {
        path: 'compras',
        loadChildren: () => import('./compras/compras.module').then(m => m.ComprasModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'compras' }
      },
      {
        path: 'configuracion',
        loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'configuracion' }
      },
      {
        path: 'ecommerce-orders',
        loadChildren: () => import('./ecommerce-orders/ecommerce-orders.module').then(m => m.EcommerceOrdersModule),
        canActivate: [ModuloGuard],
        data: { modulo: 'reportes' }
      },
    ]
  },

  // Fallback
  { path: '**', redirectTo: '/auth' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
