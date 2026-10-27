// src/server/files/local-file-store.ts
// Adjuntos en una carpeta local (FILES_ROOT): solo desarrollo y pruebas, o un montaje si DIMA lo prefiere (ADR-16).
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";
import {
  FileConflictError,
  type FileStore,
  FileStoreError,
  type StoredFile,
} from "./file-store";

export class LocalFileStore implements FileStore {
  readonly name = "local" as const;

  constructor(private readonly root: string) {}

  // POR QUÉ: el tipo MIME queda en la base; en disco no hace falta guardarlo.
  async put(
    path: string,
    data: Uint8Array,
    _mimeType?: string,
  ): Promise<StoredFile> {
    const target = this.resolve(path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data, { flag: "wx" }).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new FileConflictError(path);
      throw error;
    });
    return { storagePath: path };
  }

  async replace(
    storagePath: string,
    data: Uint8Array,
    _mimeType?: string,
  ): Promise<void> {
    const target = this.resolve(storagePath);
    // TRAMPA: reemplazar nunca crea un archivo; la referencia tiene que existir.
    await access(target);
    await writeFile(target, data);
  }

  async get(storagePath: string): Promise<Uint8Array> {
    return readFile(this.resolve(storagePath));
  }

  async remove(storagePath: string): Promise<void> {
    await rm(this.resolve(storagePath), { force: true });
  }

  // TRAMPA: la ruta guardada nunca debe salir de la carpeta raíz ("../").
  private resolve(path: string): string {
    const root = normalize(this.root);
    const target = normalize(join(root, path));
    if (!target.startsWith(root + sep))
      throw new FileStoreError("Ruta de adjunto inválida.");
    return target;
  }
}
