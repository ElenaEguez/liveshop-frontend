/**
 * Imprime HTML en un iframe oculto (útil cuando el navegador bloquea window.open, p. ej. móvil).
 */
export function printHtmlInHiddenIframe(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'print-frame');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.opacity = '0.02';
  iframe.style.border = 'none';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const runPrint = (): void => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1500);
    }
  };

  setTimeout(runPrint, 350);
}
