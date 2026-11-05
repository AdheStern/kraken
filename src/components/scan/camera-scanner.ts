// src/components/scan/camera-scanner.ts
// Abre la cámara trasera y decodifica códigos de barras y QR con zxing; traduce los errores del navegador a qué
// hacer. Solo en el cliente: la librería se carga al abrir la cámara.
import type { IScannerControls } from "@zxing/browser";

const RETRY_DELAY_MS = 500;
// TRAMPA: al reabrir la cámara apenas se soltó, el navegador puede decir por un instante que no hay o que está
// ocupada; un segundo intento la encuentra.
const TRANSIENT_ERRORS = new Set([
  "NotFoundError",
  "NotReadableError",
  "AbortError",
]);

export async function startCamera(
  video: HTMLVideoElement | null,
  onText: (text: string) => void,
): Promise<IScannerControls> {
  if (!video) throw new Error("Sin vista previa.");
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
    throw new DOMException("", "SecurityError");
  // POR QUÉ: la librería pesa; se carga solo cuando alguien abre la cámara.
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
    await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  // POR QUÉ: solo los formatos de etiquetas de equipos y cajas; probar todos es más lento y llena la consola.
  const formats = [
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
  ];
  const reader = new BrowserMultiFormatReader(
    new Map([[DecodeHintType.POSSIBLE_FORMATS, formats]]),
  );
  const open = () =>
    reader.decodeFromConstraints(
      { audio: false, video: { facingMode: { ideal: "environment" } } },
      video,
      (result) => {
        const text = result?.getText().trim();
        if (text) onText(text);
      },
    );
  try {
    return await open();
  } catch (cause) {
    if (!(cause instanceof DOMException) || !TRANSIENT_ERRORS.has(cause.name))
      throw cause;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return open();
  }
}

export function cameraErrorMessage(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : "";
  if (name === "NotAllowedError")
    return "El navegador no tiene permiso para usar la cámara. Habilítalo en el candado de la barra de direcciones y vuelve a abrir esta ventana.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "Este equipo no tiene una cámara disponible. Usa el lector o escribe el código.";
  if (name === "NotReadableError")
    return "Otra aplicación está usando la cámara. Ciérrala y vuelve a intentar.";
  if (name === "SecurityError")
    return "La cámara solo funciona con conexión segura (https). Entra a Kraken por su dirección https.";
  return "No se pudo abrir la cámara. Usa el lector o escribe el código.";
}
