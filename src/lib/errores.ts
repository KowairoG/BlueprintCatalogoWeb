/**
 * Errores propios de la aplicación.
 *
 * Viven acá, sin ninguna dependencia, a propósito: los formularios del panel
 * son componentes de cliente y necesitan reconocer estos errores. Si estas
 * clases estuvieran junto a `guards.ts` o al proveedor de inventario,
 * importarlas arrastraría Prisma y `node:fs` al bundle del navegador —
 * que es exactamente lo que hacía fallar la compilación antes.
 */

export class NoAutorizadoError extends Error {
  constructor(mensaje = "No tenés permiso para hacer esto.") {
    super(mensaje);
    this.name = "NoAutorizadoError";
  }
}

export class ArchivoInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ArchivoInvalidoError";
  }
}

export class InventarioNoConfiguradoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "InventarioNoConfiguradoError";
  }
}
