/**
 * Valores permitidos de los campos que en otra base de datos serían enums.
 * SQLite no soporta enums, así que este archivo es la única fuente de verdad:
 * el schema los guarda como String y Zod los valida contra estas listas.
 */

// --- Roles de usuario ------------------------------------------------------

export const ROLES = ["ADMIN", "EDITOR"] as const;
export type Rol = (typeof ROLES)[number];

export const ETIQUETA_ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
};

export const DESCRIPCION_ROL: Record<Rol, string> = {
  ADMIN: "Puede hacer todo, incluido crear y desactivar usuarios.",
  EDITOR: "Puede administrar productos, existencias, categorías y marcas.",
};

// --- Etiquetas de producto -------------------------------------------------

export const ETIQUETAS_PRODUCTO = ["NUEVO", "OFERTA", "TOP"] as const;
export type EtiquetaProducto = (typeof ETIQUETAS_PRODUCTO)[number];

export const TEXTO_ETIQUETA: Record<EtiquetaProducto, string> = {
  NUEVO: "Nuevo",
  OFERTA: "Oferta",
  TOP: "Más vendido",
};

// --- Estado de existencias (derivado, nunca guardado) ----------------------

export const ESTADOS_STOCK = ["hay", "poco", "agotado"] as const;
export type EstadoStock = (typeof ESTADOS_STOCK)[number];

export const TEXTO_ESTADO_STOCK: Record<EstadoStock, string> = {
  hay: "En stock",
  poco: "Últimas unidades",
  agotado: "Agotado",
};

// --- Ordenamientos del catálogo público ------------------------------------

export const ORDENES_CATALOGO = [
  "relevancia",
  "menor",
  "mayor",
  "nombre",
] as const;
export type OrdenCatalogo = (typeof ORDENES_CATALOGO)[number];

export const TEXTO_ORDEN: Record<OrdenCatalogo, string> = {
  relevancia: "Relevancia",
  menor: "Precio: menor a mayor",
  mayor: "Precio: mayor a menor",
  nombre: "Nombre A–Z",
};

// --- Helpers de validación -------------------------------------------------

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && (ROLES as readonly string[]).includes(valor);
}

export function esEtiquetaProducto(valor: unknown): valor is EtiquetaProducto {
  return (
    typeof valor === "string" &&
    (ETIQUETAS_PRODUCTO as readonly string[]).includes(valor)
  );
}

export function esOrdenCatalogo(valor: unknown): valor is OrdenCatalogo {
  return (
    typeof valor === "string" &&
    (ORDENES_CATALOGO as readonly string[]).includes(valor)
  );
}
