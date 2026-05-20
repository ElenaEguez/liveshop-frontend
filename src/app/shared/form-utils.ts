import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

/** Marca todos los controles como touched para mostrar mat-error. */
export function markAllAsTouched(control: AbstractControl): void {
  control.markAsTouched();
  if (control instanceof FormGroup) {
    Object.values(control.controls).forEach(c => markAllAsTouched(c));
  } else if (control instanceof FormArray) {
    control.controls.forEach(c => markAllAsTouched(c));
  }
}

/** Nombres legibles de controles inválidos de un FormGroup (un nivel). */
export function invalidFieldLabels(
  group: FormGroup,
  labels: Record<string, string>,
): string[] {
  const out: string[] = [];
  for (const key of Object.keys(group.controls)) {
    const ctrl = group.get(key);
    if (ctrl && ctrl.invalid && labels[key]) {
      out.push(labels[key]);
    }
  }
  return out;
}
