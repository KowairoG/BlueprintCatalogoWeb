import { cache } from "react";
import { db } from "@/lib/db";

/**
 * Configuración del negocio.
 *
 * Es una sola fila (id = "unica"). Va envuelta en `cache()` para que las
 * distintas partes de una misma página (cabecera, tarjetas, pie) no repitan la
 * consulta.
 */

export const ID_CONFIGURACION = "unica";

export const obtenerConfiguracion = cache(async () => {
  // Se crea sola la primera vez, así el sitio nunca revienta por falta de
  // configuración aunque no se haya corrido el seed.
  return db.configuracion.upsert({
    where: { id: ID_CONFIGURACION },
    update: {},
    create: { id: ID_CONFIGURACION },
  });
});

export type Configuracion = Awaited<ReturnType<typeof obtenerConfiguracion>>;
