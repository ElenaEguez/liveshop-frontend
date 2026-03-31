import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {

  constructor(private auth: AuthService) {}

  private getPayload(): any {
    return this.auth.getTokenPayload();
  }

  isVendorOwner(): boolean {
    return this.getPayload()?.is_vendor_owner === true;
  }

  private perm(key: string): boolean {
    if (this.isVendorOwner()) return true;
    return this.getPayload()?.perms?.[key] === true;
  }

  canViewProducts():    boolean { return this.perm('products'); }
  canViewCategories():  boolean { return this.perm('categories'); }
  canViewInventory():   boolean { return this.perm('inventory'); }
  canViewLiveSessions():boolean { return this.perm('live_sessions'); }
  canViewMyStore():     boolean { return this.perm('my_store'); }
  canViewOrders():      boolean { return this.perm('orders'); }
  canConfirmPayments(): boolean { return this.perm('payments'); }
  canManageTeam():      boolean { return this.perm('team'); }
  canViewDashboard():   boolean { return this.perm('dashboard'); }

  canUsePOS():       boolean { return this.perm('pos') || this.isVendorOwner(); }
  canUseWarehouse(): boolean { return this.perm('warehouse') || this.isVendorOwner(); }
  canUseExpenses():  boolean { return this.perm('expenses') || this.isVendorOwner(); }
  canUseSettings():  boolean { return this.isVendorOwner(); }

  /** True if any catalog sub-module is permitted */
  canManageCatalog(): boolean {
    return this.canViewProducts() || this.canViewCategories()
        || this.canViewInventory() || this.canViewLiveSessions()
        || this.canViewMyStore();
  }
}
