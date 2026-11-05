// src/components/scan/camera-scan-dialog.tsx
// Escaneo con la cámara del equipo (AGENTS.md §2.8): alternativa al lector físico. Lee de forma continua para
// pasar varios seriales sin cerrar, o una sola vez (`once`) para llenar un campo, como el código de un producto.
"use client";

import type { IScannerControls } from "@zxing/browser";
import { Camera } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { cameraErrorMessage, startCamera } from "./camera-scanner";

// POR QUÉ: la cámara ve el mismo código en muchos cuadros seguidos; sin esta pausa un serial entraría varias veces.
const REPEAT_PAUSE_MS = 2000;

type Feedback = { ok: boolean; message: string };
type Props = {
  onScan: (text: string) => Feedback;
  // Cierra tras la primera lectura aceptada: para llenar un campo con un solo código.
  once?: boolean;
  label?: string;
  triggerClassName?: string;
};

export function CameraScanDialog({
  onScan,
  once = false,
  label = "Escanear con la cámara",
  triggerClassName = "h-14 px-4",
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={triggerClassName}
            aria-label={label}
          />
        }
      >
        <Camera aria-hidden="true" />
        <span className="hidden sm:inline">Cámara</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {once
              ? "Apunta al código de barras o QR; la ventana se cierra al leerlo."
              : "Apunta al código de barras o QR. Puedes escanear varios seguidos; cierra cuando termines."}
          </DialogDescription>
        </DialogHeader>
        <CameraView
          onScan={(text) => {
            const result = onScan(text);
            if (once && result.ok) setOpen(false);
            return result;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CameraView({ onScan }: Pick<Props, "onScan">) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastRef = useRef({ text: "", at: 0 });
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const onDecoded = useEffectEvent((text: string) => {
    const now = Date.now();
    const last = lastRef.current;
    if (text === last.text && now - last.at < REPEAT_PAUSE_MS) return;
    lastRef.current = { text, at: now };
    const result = onScan(text);
    setFeedback(result);
    if (result.ok) navigator.vibrate?.(60);
  });

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let cancelled = false;
    startCamera(videoRef.current, (text) => onDecoded(text))
      .then((started) => {
        if (cancelled) started.stop();
        else controls = started;
      })
      .catch((cause: unknown) => setError(cameraErrorMessage(cause)));
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  if (error)
    return (
      <p
        role="alert"
        className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {error}
      </p>
    );
  return (
    <div className="grid gap-2">
      <video
        ref={videoRef}
        muted
        playsInline
        className="aspect-4/3 w-full rounded-lg bg-black object-cover"
      />
      <p
        aria-live="polite"
        className={cn(
          "min-h-5 text-sm",
          feedback?.ok === false ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {feedback?.message ?? "Buscando un código…"}
      </p>
    </div>
  );
}
