import { cache } from "react";
import { db } from "@/lib/db";
import { inventario, type ExistenciaSede } from "@/lib/inventario";
import type { OrdenCatalogo } from "@/lib/constantes";
import { terminosDeBusqueda } from "@/features/productos/busqueda";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Consultas de productos.
 *
 * Las existencias NUNCA se leen con un `include` de Prisma: se piden al
 * proveedor de inventario (`@/lib/inventario`). Ese rodeo es a propósito —
 * es lo que permite que mañana el stock venga de un sistema externo sin tocar
 * ninguna pantalla. Ver docs/integraciones.md
 */

const SELECT_TARJETA = {
  id: true,
  sku: true,
  nombre: true,
  slug: true,
  descripcion: true,
  emoji: true,
  precio: true,
  precioAnterior: true,
  mostrarPrecio: true,
  etiqueta: true,
  destacado: true,
  categoria: { select: { id: true, nombre: true, slug: true } },
  marca: { select: { id: true, nombre: true, slug: true } },
  imagenes: {
    select: { url: true, alt: true },
    orderBy: { orden: "asc" },
    take: 1,
  },
} satisfies Prisma.ProductoSelect;

export type ProductoTarjeta = Prisma.ProductoGetPayload<{
  select: typeof SELECT_TARJETA;
}> & { existencias: ExistenciaSede[] };

// --- Catálogo público ------------------------------------------------------

export type FiltrosCatalogo = {
  texto?: string;
  categoriaSlug?: string;
  sedeSlug?: string;
  marcaSlug?: string;
  orden?: OrdenCatalogo;
  soloOfertas?: boolean;
};

function whereCatalogo(filtros: FiltrosCatalogo): Prisma.ProductoWhereInput {
  const condiciones: Prisma.ProductoWhereInput[] = [{ publicado: true }];

  if (filtros.categoriaSlug) {
    // Acepta tanto una categoría madre como una subcategoría: si es madre,
    // también trae lo que cuelgue de ella.
    condiciones.push({
      OR: [
        { categoria: { slug: filtros.categoriaSlug } },
        { categoria: { padre: { slug: filtros.categoriaSlug } } },
      ],
    });
  }

  if (filtros.marcaSlug) {
    condiciones.push({ marca: { slug: filtros.marcaSlug } });
  }

  if (filtros.soloOfertas) {
    condiciones.push({ etiqueta: "OFERTA" });
  }

  // Cada palabra buscada tiene que aparecer. La columna `busqueda` ya viene
  // en minúsculas y sin tildes, por eso alcanza con un `contains`.
  for (const termino of terminosDeBusqueda(filtros.texto ?? "")) {
    condiciones.push({ busqueda: { contains: termino } });
  }

  if (filtros.sedeSlug) {
    // "Disponible en mi sede" significa que hay unidades ahí, no que exista
    // la fila de existencia.
    condiciones.push({
      existencias: {
        some: { sede: { slug: filtros.sedeSlug }, cantidad: { gt: 0 } },
      },
    });
  }

  return { AND: condiciones };
}

function orderByCatalogo(
  orden: OrdenCatalogo | undefined,
  permitePrecio: boolean
): Prisma.ProductoOrderByWithRelationInput[] {
  if ((orden === "menor" || orden === "mayor") && permitePrecio) {
    return [{ precio: orden === "menor" ? "asc" : "desc" }];
  }
  if (orden === "nombre") {
    return [{ nombre: "asc" }];
  }
  // Relevancia: primero lo marcado como destacado, después lo nuevo.
  return [{ destacado: "desc" }, { creadoEn: "desc" }];
}

export async function buscarProductos(
  filtros: FiltrosCatalogo,
  opciones: { permiteOrdenarPorPrecio: boolean }
): Promise<ProductoTarjeta[]> {
  const productos = await db.producto.findMany({
    where: whereCatalogo(filtros),
    select: SELECT_TARJETA,
    orderBy: orderByCatalogo(filtros.orden, opciones.permiteOrdenarPorPrecio),
    take: 120,
  });

  return conExistencias(productos);
}

/** Adjunta las existencias en una sola llamada al proveedor, sin N+1. */
async function conExistencias<T extends { id: string }>(
  productos: T[]
): Promise<(T & { existencias: ExistenciaSede[] })[]> {
  const porProducto = await inventario.porProductos(productos.map((p) => p.id));
  return productos.map((producto) => ({
    ...producto,
    existencias: porProducto.get(producto.id) ?? [],
  }));
}

// --- Detalle público -------------------------------------------------------

export const obtenerProductoPorSlug = cache(async (slug: string) => {
  const producto = await db.producto.findUnique({
    where: { slug },
    include: {
      categoria: { include: { padre: true } },
      marca: true,
      imagenes: { orderBy: { orden: "asc" } },
    },
  });

  if (!producto || !producto.publicado) return null;

  return {
    ...producto,
    existencias: await inventario.porProducto(producto.id),
  };
});

export async function productosRelacionados(
  productoId: string,
  categoriaId: string,
  limite = 4
): Promise<ProductoTarjeta[]> {
  const productos = await db.producto.findMany({
    where: { publicado: true, categoriaId, id: { not: productoId } },
    select: SELECT_TARJETA,
    orderBy: [{ destacado: "desc" }, { creadoEn: "desc" }],
    take: limite,
  });

  return conExistencias(productos);
}

// --- Listado del panel -----------------------------------------------------

export type FiltrosAdmin = {
  texto?: string;
  categoriaId?: string;
  marcaId?: string;
  estado?: "todos" | "publicados" | "borradores" | "agotados";
  pagina?: number;
};

export const PRODUCTOS_POR_PAGINA = 20;

export async function listarProductosAdmin(filtros: FiltrosAdmin) {
  const condiciones: Prisma.ProductoWhereInput[] = [];

  for (const termino of terminosDeBusqueda(filtros.texto ?? "")) {
    condiciones.push({ busqueda: { contains: termino } });
  }
  if (filtros.categoriaId) condiciones.push({ categoriaId: filtros.categoriaId });
  if (filtros.marcaId) condiciones.push({ marcaId: filtros.marcaId });
  if (filtros.estado === "publicados") condiciones.push({ publicado: true });
  if (filtros.estado === "borradores") condiciones.push({ publicado: false });
  if (filtros.estado === "agotados") {
    condiciones.push({ existencias: { every: { cantidad: { lte: 0 } } } });
  }

  const where: Prisma.ProductoWhereInput =
    condiciones.length > 0 ? { AND: condiciones } : {};

  const pagina = Math.max(1, filtros.pagina ?? 1);

  const [productos, total] = await Promise.all([
    db.producto.findMany({
      where,
      select: { ...SELECT_TARJETA, publicado: true, actualizadoEn: true },
      orderBy: { actualizadoEn: "desc" },
      skip: (pagina - 1) * PRODUCTOS_POR_PAGINA,
      take: PRODUCTOS_POR_PAGINA,
    }),
    db.producto.count({ where }),
  ]);

  return {
    productos: await conExistencias(productos),
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / PRODUCTOS_POR_PAGINA)),
  };
}

export async function obtenerProductoParaEditar(id: string) {
  const producto = await db.producto.findUnique({
    where: { id },
    include: {
      imagenes: { orderBy: { orden: "asc" } },
      existencias: { include: { sede: true } },
    },
  });
  if (!producto) return null;
  return producto;
}

// --- Datos de apoyo para formularios y filtros -----------------------------

export const listarCategoriasMadre = cache(async () =>
  db.categoria.findMany({
    where: { padreId: null },
    orderBy: { orden: "asc" },
    include: {
      hijas: { orderBy: { orden: "asc" } },
      _count: { select: { productos: { where: { publicado: true } } } },
    },
  })
);

/**
 * El árbol aplanado para los desplegables: cada categoría madre seguida de sus
 * hijas. Ordenar en SQL por `orden` mezclaría madres e hijas de distintas ramas
 * en una lista ilegible, así que el agrupado se arma acá.
 */
export const listarCategoriasPlanas = cache(async () => {
  const madres = await db.categoria.findMany({
    where: { padreId: null },
    orderBy: { orden: "asc" },
    include: { hijas: { orderBy: { orden: "asc" } } },
  });

  return madres.flatMap((madre) => [
    { id: madre.id, nombre: madre.nombre, padre: null as { nombre: string } | null },
    ...madre.hijas.map((hija) => ({
      id: hija.id,
      nombre: hija.nombre,
      padre: { nombre: madre.nombre },
    })),
  ]);
});

export const listarMarcas = cache(async () =>
  db.marca.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: {
      _count: { select: { productos: { where: { publicado: true } } } },
    },
  })
);

export const listarSedes = cache(async () =>
  db.sede.findMany({ where: { activa: true }, orderBy: { orden: "asc" } })
);

/** Sedes que efectivamente llevan stock (excluye las "próximamente"). */
export const listarSedesConStock = cache(async () =>
  db.sede.findMany({
    where: { activa: true, proximamente: false },
    orderBy: { orden: "asc" },
  })
);
