/** EAN-13: generación, validación y renderizado escaneable en POS. */

export function ean13CheckDigit(digits12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits12[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(value: string | null | undefined): boolean {
  const code = (value || '').trim();
  if (code.length !== 13 || !/^\d{13}$/.test(code)) {
    return false;
  }
  return parseInt(code[12], 10) === ean13CheckDigit(code.slice(0, 12));
}

/** EAN-13 aleatorio con prefijo 2 (uso interno) y dígito de control. */
export function generateEan13(): string {
  let digits = '2';
  for (let i = 0; i < 11; i++) {
    digits += Math.floor(Math.random() * 10);
  }
  return digits + String(ean13CheckDigit(digits));
}

/** Valor listo para JsBarcode EAN13 (13 dígitos con control correcto). */
export function ean13ForRender(raw: string): string | null {
  const trimmed = (raw || '').trim();
  const onlyDigits = trimmed.replace(/\D/g, '');
  if (onlyDigits.length === 13 && isValidEan13(onlyDigits)) {
    return onlyDigits;
  }
  if (onlyDigits.length === 12) {
    return onlyDigits + String(ean13CheckDigit(onlyDigits));
  }
  return null;
}
