import QRCode from "qrcode";

export function chromebookQrPath(chromebookId: string) {
  return `/q/chromebook/${chromebookId}`;
}

export function cartQrPath(cartId: string) {
  return `/q/carro/${cartId}`;
}

export async function generateQrDataUrl(text: string, width = 240) {
  return QRCode.toDataURL(text, { margin: 1, width });
}
