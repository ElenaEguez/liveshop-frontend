import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stock-badge',
  template: `
    <span [ngClass]="badgeClass" class="px-2 py-1 rounded-full text-xs font-medium">
      {{ stockText }}
    </span>
  `,
  styles: []
})
export class StockBadgeComponent {
  @Input() stock: number = 0;

  get badgeClass(): string {
    if (this.stock > 5) {
      return 'bg-green-100 text-green-800';
    } else if (this.stock > 0) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  }

  get stockText(): string {
    if (this.stock > 5) {
      return 'En Stock';
    } else if (this.stock > 0) {
      return `Pocas Unidades (${this.stock})`;
    } else {
      return 'Agotado';
    }
  }
}