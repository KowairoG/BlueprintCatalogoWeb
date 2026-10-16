/**
 * Datos iniciales del negocio. ESTE ES EL ARCHIVO QUE SE EDITA AL CLONAR.
 *
 * El resto del proyecto no sabe cómo se llama la tienda ni qué vende: todo se
 * lee de la tabla `Configuracion`, que se llena con lo que hay acá. Cambiar de
 * cliente es cambiar este archivo y correr `npm run setup`.
 *
 * Está separado de seed.ts para que corregir datos no obligue a tocar la
 * lógica de carga.
 *
 * Lo que viene abajo son PLACEHOLDERS y un ejemplo mínimo (una sede, una
 * categoría, dos productos) que sirve para comprobar que la carga funciona de
 * punta a punta. Reemplazá todo con los datos reales del cliente.
 */

// --- Identidad del negocio -------------------------------------------------
//
// Los campos que quedan en "" se pueden llenar después desde
// /admin/configuracion, sin tocar código. El seed no pisa lo que ya se editó
// desde el panel: solo rellena lo que sigue vacío.

export const NEGOCIO = {
  nombreNegocio: "Nombre del Negocio",
  nombreCorto: "NEGOCIO",
  rubro: "CATÁLOGO",
  // El archivo del logo se sube desde /admin/configuracion, no se versiona
  // acá: es un dato del negocio y vive en el almacenamiento de imágenes.
  // Mientras no haya archivo, se usa el emoji.
  logoEmoji: "🛒",
  eslogan: "",
  ubicacion: "",
  descripcionSeo: "",
  telefono: "",
  // Formato internacional, sin el +. Ej. 50612345678
  whatsapp: "",
  horario: "",
  avisoBarra: "",
  facebookUrl: "",
  tiktokUrl: "",
} as const;

// --- Sedes -----------------------------------------------------------------
//
// Una tienda de un solo local también necesita una sede: es contra la sede que
// se guardan las existencias. `proximamente: true` la muestra en el sitio con
// la etiqueta "Próximamente" y no le carga stock.

export const SEDES = [
  {
    slug: "sede-principal",
    nombre: "Sede principal",
    direccion: "Dirección de la sede",
    telefono: null as string | null,
    orden: 1,
    proximamente: false,
  },
];

// --- Marcas ----------------------------------------------------------------
//
// "Genérico" conviene dejarla: es la que se le pone a los productos que no
// tienen marca propia. Las demás salen de lo que el cliente realmente vende.

export const MARCAS = [{ slug: "generico", nombre: "Genérico", orden: 1 }];

// --- Árbol de categorías ---------------------------------------------------
//
// Las categorías madre son las que salen en el mega menú; las subcategorías
// cuelgan de ellas. El slug de la subcategoría se arma con el prefijo de la
// madre, así que dos ramas pueden tener una subcategoría con el mismo nombre.

export const CATEGORIAS = [
  {
    slug: "categoria-ejemplo",
    nombre: "Categoría de ejemplo",
    icono: "📦",
    descripcion: "Una línea corta que explica qué hay adentro",
    subcategorias: ["Subcategoría A", "Subcategoría B", "Subcategoría C"],
  },
];

// --- Productos -------------------------------------------------------------
//
// `stock` se escribe en estados y no en números porque al relevar el catálogo
// de un cliente uno sabe si hay o no hay, no la cantidad exacta. Las claves
// son slugs de SEDES; una sede que no aparezca queda sin existencia.

type EstadoInicial = "hay" | "poco" | "agotado";

export const CANTIDAD_POR_ESTADO: Record<EstadoInicial, number> = {
  hay: 6,
  poco: 2,
  agotado: 0,
};

export type ProductoInicial = {
  sku: string;
  nombre: string;
  descripcion: string;
  /** Slug de una categoría madre de CATEGORIAS. */
  categoria: string;
  /** Slug de una marca de MARCAS. */
  marca: string;
  /** Respaldo visual mientras el producto no tenga foto. */
  emoji: string;
  /** En unidades enteras de la moneda. Nunca decimales. */
  precio: number;
  precioAnterior: number | null;
  etiqueta: "NUEVO" | "OFERTA" | "TOP" | null;
  /** Clave = slug de sede. */
  stock: Record<string, EstadoInicial>;
};

export const PRODUCTOS: ProductoInicial[] = [
  {
    sku: "EJ-001",
    nombre: "Producto de ejemplo",
    descripcion:
      "Descripción corta, la que sirve para decidir. Se puede editar desde el panel.",
    categoria: "categoria-ejemplo",
    marca: "generico",
    emoji: "📦",
    precio: 10000,
    precioAnterior: null,
    etiqueta: "NUEVO",
    stock: { "sede-principal": "hay" },
  },
  {
    sku: "EJ-002",
    nombre: "Producto de ejemplo en oferta",
    descripcion:
      "Cuando hay precioAnterior, la tarjeta muestra el precio tachado.",
    categoria: "categoria-ejemplo",
    marca: "generico",
    emoji: "🏷️",
    precio: 8500,
    precioAnterior: 12000,
    etiqueta: "OFERTA",
    stock: { "sede-principal": "poco" },
  },
];
