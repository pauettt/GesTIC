import QRCode from "qrcode";

export function chromebookQrPath(chromebookId: string) {
  return `/q/chromebook/${chromebookId}`;
}

export async function generateQrDataUrl(text: string) {
  return QRCode.toDataURL(text, { margin: 1, width: 240 });
}
