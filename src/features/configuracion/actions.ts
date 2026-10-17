"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ejecutarAccion,
  exito,
  falloDeValidacion,
  type EstadoAccion,
} from "@/lib/acciones";
import { db } from "@/lib/db";
import { requireUsuarioEnAccion } from "@/lib/guards";
import { almacenamiento, claveDesdeUrl } from "@/lib/storage";
import { ID_CONFIGURACION } from "@/features/configuracion/queries";

/** Datos del negocio y política de precios. */

/**
 * Guarda el archivo de logo si vino uno nuevo, y borra el anterior.
 * Devuelve la URL a persistir, o `undefined` si no hay que tocar el campo.
 */
async function resolverLogo(
  formData: FormData,
  logoActual: string
): Promise<string | undefined> {
  if (formData.get("quitarLogo") !== null) {
    if (logoActual) {
      const clave = claveDesdeUrl(logoActual);
      if (clave) await almacenamiento.borrar(clave);
    }
    return "";
  }

  const archivo = formData.get("logo");
  if (!(archivo instanceof File) || archivo.size === 0) return undefined;

  // Se sube primero: si el archivo no es una imagen válida, esto lanza y no se
  // guarda ningún cambio de configuración.
  const guardado = await almacenamiento.guardar(archivo);

  if (logoActual) {
    const clave = claveDesdeUrl(logoActual);
    if (clave) await almacenamiento.borrar(clave);
  }

  return guardado.url;
}

const esquema = z.object({
  nombreNegocio: z.string().trim().min(2, "Escribí el nombre del negocio.").max(80),
  nombreCorto: z
    .string()
    .trim()
    .min(1, "Escribí la palabra que va grande en el logo.")
    .max(24, "Es muy largo para el logo."),
  rubro: z.string().trim().max(30, "Es muy largo para el logo."),
  logoEmoji: z.string().trim().max(8),
  eslogan: z.string().trim().max(120),
  ubicacion: z.string().trim().max(120),
  descripcionSeo: z.string().trim().max(300),
  telefono: z.string().trim().min(4, "Escribí el teléfono.").max(30),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d]/g, ""))
    .pipe(
      z
        .string()
        .min(8, "Escribí el número con código de país, ej. 50664546710.")
        .max(15)
    ),
  horario: z.string().trim().max(80),
  avisoBarra: z.string().trim().max(160),
  facebookUrl: z.string().trim().max(200),
  tiktokUrl: z.string().trim().max(200),
  mostrarPreciosPorDefecto: z.boolean(),
});

export async function guardarConfiguracion(
  _previo: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  // Para repoblar el formulario si el guardado falla (React 19 resetea el form).
  // El logo (archivo) no se repuebla: los <input type=file> no se pueden rellenar.
  const enviados = {
    nombreNegocio: String(formData.get("nombreNegocio") ?? ""),
    nombreCorto: String(formData.get("nombreCorto") ?? ""),
    rubro: String(formData.get("rubro") ?? ""),
    logoEmoji: String(formData.get("logoEmoji") ?? ""),
    eslogan: String(formData.get("eslogan") ?? ""),
    ubicacion: String(formData.get("ubicacion") ?? ""),
    descripcionSeo: String(formData.get("descripcionSeo") ?? ""),
    telefono: String(formData.get("telefono") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    horario: String(formData.get("horario") ?? ""),
    avisoBarra: String(formData.get("avisoBarra") ?? ""),
    facebookUrl: String(formData.get("facebookUrl") ?? ""),
    tiktokUrl: String(formData.get("tiktokUrl") ?? ""),
    mostrarPreciosPorDefecto: formData.get("mostrarPreciosPorDefecto") !== null,
  };

  const resultado = await ejecutarAccion(async () => {
    await requireUsuarioEnAccion();

    const parseo = esquema.safeParse({
      nombreNegocio: formData.get("nombreNegocio") ?? "",
      nombreCorto: formData.get("nombreCorto") ?? "",
      rubro: formData.get("rubro") ?? "",
      logoEmoji: formData.get("logoEmoji") ?? "",
      eslogan: formData.get("eslogan") ?? "",
      ubicacion: formData.get("ubicacion") ?? "",
      descripcionSeo: formData.get("descripcionSeo") ?? "",
      telefono: formData.get("telefono") ?? "",
      whatsapp: formData.get("whatsapp") ?? "",
      horario: formData.get("horario") ?? "",
      avisoBarra: formData.get("avisoBarra") ?? "",
      facebookUrl: formData.get("facebookUrl") ?? "",
      tiktokUrl: formData.get("tiktokUrl") ?? "",
      mostrarPreciosPorDefecto: formData.get("mostrarPreciosPorDefecto") !== null,
    });
    if (!parseo.success) return falloDeValidacion(parseo.error);

    const actual = await db.configuracion.findUnique({
      where: { id: ID_CONFIGURACION },
      select: { logoUrl: true },
    });

    const logoUrl = await resolverLogo(formData, actual?.logoUrl ?? "");
    const datos = {
      ...parseo.data,
      ...(logoUrl === undefined ? {} : { logoUrl }),
    };

    await db.configuracion.upsert({
      where: { id: ID_CONFIGURACION },
      update: datos,
      create: { id: ID_CONFIGURACION, ...datos },
    });

    // La política de precios afecta a todo el sitio, no solo a una página.
    revalidatePath("/", "layout");

    return exito("Configuración guardada.");
  });

  return resultado.ok
    ? resultado
    : { ...resultado, valores: enviados, nonce: crypto.randomUUID() };
}
