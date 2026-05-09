import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { VariantSelectorComponent } from './variant-selector/variant-selector.component';
import { SinPermisoComponent } from './components/sin-permiso/sin-permiso.component';
import { SuscripcionVencidaComponent } from './components/suscripcion-vencida/suscripcion-vencida.component';

@NgModule({
  declarations: [VariantSelectorComponent, SinPermisoComponent, SuscripcionVencidaComponent],
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  exports: [VariantSelectorComponent, SinPermisoComponent, SuscripcionVencidaComponent],
})
export class SharedModule {}
