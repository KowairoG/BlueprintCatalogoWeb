import { z } from "zod";
import {
  ArchivoInvalidoError,
  InventarioNoConfiguradoError,
  NoAutorizadoError,
} from "@/lib/errores";

/**
 * Forma común del resultado de una server action usada con `useActionState`.
 *
 * Tener una sola forma evita que cada formulario invente la suya y permite un
 * único componente de mensajes en la interfaz.
 */

export type EstadoAccion = {
  ok: boolean;
  mensaje?: string;
  /** Errores por campo, tal como los devuelve Zod. */
  errores?: Record<string, string[]>;
  /**
   * Valores que el usuario había enviado, para repoblar el formulario cuando la
   * acción falla. React 19 resetea el `<form>` después de cada acción, así que
   * sin esto se perdería todo lo digitado al primer error.
   */
  valores?: Record<string, unknown>;
  /**
   * Identificador único de este resultado. El formulario lo usa como `key` para
   * remontarse en cada fallo y así tomar de nuevo su `defaultValue` (ya
   * repoblado con `valores`); React no re-sincroniza `defaultValue` en un
   * re-render normal, solo al montar.
   */
  nonce?: string;
};

export const ESTADO_INICIAL: EstadoAccion = { ok: false };

export function exito(mensaje: string): EstadoAccion {
  return { ok: true, mensaje };
}

export function fallo(mensaje: string, errores?: Record<string, string[]>): EstadoAccion {
  return { ok: false, mensaje, errores };
}

/** Convierte un ZodError en el formato de `EstadoAccion`. */
export function falloDeValidacion(error: z.ZodError): EstadoAccion {
  const { fieldErrors } = z.flattenError(error);
  return {
    ok: false,
    mensaje: "Revisá los campos marcados.",
    errores: fieldErrors as Record<string, string[]>,
  };
}

/**
 * Envuelve el cuerpo de una server action y traduce las excepciones conocidas
 * a mensajes que el usuario pueda entender.
 *
 * Importante: `redirect()` de Next.js funciona lanzando una excepción de
 * control de flujo. Si la atrapáramos, la navegación nunca ocurriría; por eso
 * se vuelve a lanzar cualquier error que Next marque como suyo.
 */
export async function ejecutarAccion(
  cuerpo: () => Promise<EstadoAccion>
): Promise<EstadoAccion> {
  try {
    return await cuerpo();
  } catch (error) {
    if (esErrorDeNext(error)) throw error;

    if (error instanceof z.ZodError) return falloDeValidacion(error);

    if (
      error instanceof NoAutorizadoError ||
      error instanceof ArchivoInvalidoError ||
      error instanceof InventarioNoConfiguradoError
    ) {
      return fallo(error.message);
    }

    console.error("[accion]", error);
    return fallo("Algo falló al guardar. Intentá de nuevo.");
  }
}

/** `redirect()` y `notFound()` señalizan lanzando un error con este digest. */
function esErrorDeNext(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}
