"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ejecutarAccion,
  exito,
  fallo,
  falloDeValidacion,
  type EstadoAccion,
} from "@/lib/acciones";
import { db } from "@/lib/db";
import { requireUsuarioEnAccion } from "@/lib/guards";
import { inventario } from "@/lib/inventario";
import {
  almacenamiento,
  claveDesdeUrl,
  type ArchivoGuardado,
} from "@/lib/storage";
import { slugUnico } from "@/lib/texto";
import { textoDeBusqueda } from "@/features/productos/busqueda";
import {
  esquemaProducto,
  leerExistencias,
  leerFormularioProducto,
} from "@/features/productos/schemas";

/**
 * CRUD de productos.
 *
 * Toda acción empieza verificando la sesión: una server action es un endpoint
 * POST real y se puede invocar sin pasar por la interfaz del panel.
 */

function refrescarVistas(slug?: string) {
  revalidatePath("/");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/inventario");
  if (slug) revalidatePath(`/producto/${slug}`);
}

/** Campos que se derivan de otros y no vienen del formulario. */
async function camposDerivados(datos: {
  nombre: string;
  descripcion: string;
  sku: string | null;
  categoriaId: string;
  marcaId: string | null;
}) {
  const [categoria, marca] = await Promise.all([
    db.categoria.findUnique({
      where: { id: datos.categoriaId },
      select: { nombre: true },
    }),
    datos.marcaId
      ? db.marca.findUnique({
          where: { id: datos.marcaId },
          select: { nombre: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    busqueda: textoDeBusqueda({
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      sku: datos.sku,
      marcaNombre: marca?.nombre,
      categoriaNombre: categoria?.nombre,
    }),
  };
}

/** Guarda las existencias del formulario, si el proveedor las acepta. */
async function guardarExistencias(productoId: string, formData: FormData) {
  if (inventario.soloLectura) return;

  for (const [sedeId, cantidad] of leerExistencias(formData)) {
    await inventario.ajustar(productoId, sedeId, cantidad);
  }
}

/**
 * Valida y sube las imágenes del formulario, ANTES de tocar la base de datos.
 *
 * El orden importa: si el producto se guardara primero y la imagen fallara
 * después, quedaría un producto creado y publicado mientras el usuario ve un
 * mensaje de error — y al reintentar crearía un duplicado.
 *
 * Si una imagen falla a mitad de camino, se borran las que ya se habían
 * subido: es preferible perder archivos a dejarlos huérfanos ocupando disco
 * sin ninguna fila que los referencie.
 */
async function subirImagenes(formData: FormData): Promise<ArchivoGuardado[]> {
  const archivos = formData
    .getAll("imagenes")
    .filter((v): v is File => v instanceof File && v.size > 0);

  const subidas: ArchivoGuardado[] = [];

  try {
    for (const archivo of archivos) {
      subidas.push(await almacenamiento.guardar(archivo));
    }
  } catch (error) {
    await Promise.all(subidas.map((s) => almacenamiento.borrar(s.clave)));
    throw error;
  }

  return subidas;
}

/** Descarta archivos ya subidos cuando la escritura en base falla después. */
async function descartarImagenes(subidas: ArchivoGuardado[]) {
  await Promise.all(subidas.map((s) => almacenamiento.borrar(s.clave)));
}

// --- Crear -----------------------------------------------------------------

export async function crearProducto(
  _estadoPrevio: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  let destino: string | null = null;
  // Se arma ANTES de cualquier posible fallo para poder devolverlo y repoblar
  // el formulario si algo sale mal (validación, duplicado, imagen, base…).
  const enviados = leerFormularioProducto(formData);

  const resultado = await ejecutarAccion(async () => {
    await requireUsuarioEnAccion();

    const parseo = esquemaProducto.safeParse(leerFormularioProducto(formData));
    if (!parseo.success) return falloDeValidacion(parseo.error);
    const datos = parseo.data;

    if (datos.sku) {
      const repetido = await db.producto.findUnique({
        where: { sku: datos.sku },
        select: { id: true },
      });
      if (repetido) {
        return fallo("Ya hay un producto con ese código.", {
          sku: ["Este código ya está en uso."],
        });
      }
    }

    const slug = await slugUnico(datos.nombre, async (candidato) =>
      Boolean(
        await db.producto.findUnique({
          where: { slug: candidato },
          select: { id: true },
        })
      )
    );

    // Las imágenes primero: si alguna es inválida, esto lanza y no se crea
    // ningún producto. `ejecutarAccion` traduce el error a un mensaje.
    const imagenes = await subirImagenes(formData);

    let producto;
    try {
      producto = await db.producto.create({
        data: {
          ...datos,
          slug,
          ...(await camposDerivados(datos)),
          imagenes: {
            create: imagenes.map((imagen, orden) => ({ url: imagen.url, orden })),
          },
        },
      });
    } catch (error) {
      await descartarImagenes(imagenes);
      throw error;
    }

    await guardarExistencias(producto.id, formData);

    refrescarVistas(slug);
    destino = `/admin/productos/${producto.id}?creado=1`;
    return exito("Producto creado.");
  });

  // El redirect va afuera del try/catch: adentro lo atraparía el manejador de
  // errores, porque Next lo señaliza lanzando una excepción.
  if (destino) redirect(destino);
  return resultado.ok
    ? resultado
    : { ...resultado, valores: enviados, nonce: crypto.randomUUID() };
}

// --- Editar ----------------------------------------------------------------

export async function actualizarProducto(
  _estadoPrevio: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const enviados = leerFormularioProducto(formData);

  const resultado = await ejecutarAccion(async () => {
    await requireUsuarioEnAccion();

    const id = String(formData.get("id") ?? "");
    if (!id) return fallo("Falta el identificador del producto.");

    const actual = await db.producto.findUnique({
      where: { id },
      select: { id: true, slug: true, nombre: true },
    });
    if (!actual) return fallo("Ese producto ya no existe.");

    const parseo = esquemaProducto.safeParse(leerFormularioProducto(formData));
    if (!parseo.success) return falloDeValidacion(parseo.error);
    const datos = parseo.data;

    if (datos.sku) {
      const repetido = await db.producto.findUnique({
        where: { sku: datos.sku },
        select: { id: true },
      });
      if (repetido && repetido.id !== id) {
        return fallo("Ya hay otro producto con ese código.", {
          sku: ["Este código ya está en uso."],
        });
      }
    }

    // El slug solo cambia si cambió el nombre: así no se rompen los links que
    // el negocio ya haya compartido.
    const slug =
      datos.nombre === actual.nombre
        ? actual.slug
        : await slugUnico(datos.nombre, async (candidato) => {
            const existente = await db.producto.findUnique({
              where: { slug: candidato },
              select: { id: true },
            });
            return Boolean(existente && existente.id !== id);
          });

    // Igual que al crear: si una imagen nueva es inválida, no se guarda ningún
    // cambio. El usuario corrige el archivo y vuelve a enviar.
    const imagenes = await subirImagenes(formData);
    const desde = await db.productoImagen.count({ where: { productoId: id } });

    try {
      await db.producto.update({
        where: { id },
        data: {
          ...datos,
          slug,
          ...(await camposDerivados(datos)),
          imagenes: {
            create: imagenes.map((imagen, indice) => ({
              url: imagen.url,
              orden: desde + indice,
            })),
          },
        },
      });
    } catch (error) {
      await descartarImagenes(imagenes);
      throw error;
    }

    await guardarExistencias(id, formData);

    refrescarVistas(slug);
    if (slug !== actual.slug) revalidatePath(`/producto/${actual.slug}`);

    return exito("Cambios guardados.");
  });

  return resultado.ok
    ? resultado
    : { ...resultado, valores: enviados, nonce: crypto.randomUUID() };
}

// --- Publicar / despublicar ------------------------------------------------

export async function alternarPublicado(formData: FormData): Promise<void> {
  await requireUsuarioEnAccion();

  const id = String(formData.get("id") ?? "");
  const producto = await db.producto.findUnique({
    where: { id },
    select: { publicado: true, slug: true },
  });
  if (!producto) return;

  await db.producto.update({
    where: { id },
    data: { publicado: !producto.publicado },
  });

  refrescarVistas(producto.slug);
}

// --- Eliminar --------------------------------------------------------------

export async function eliminarProducto(formData: FormData): Promise<void> {
  await requireUsuarioEnAccion();

  const id = String(formData.get("id") ?? "");
  const producto = await db.producto.findUnique({
    where: { id },
    include: { imagenes: true },
  });
  if (!producto) return;

  // Primero los archivos: si falla el borrado en base, no quedan huérfanos al
  // revés (una fila apuntando a un archivo que ya no está).
  for (const imagen of producto.imagenes) {
    const clave = claveDesdeUrl(imagen.url);
    if (clave) await almacenamiento.borrar(clave);
  }

  // Las imágenes y existencias caen solas por onDelete: Cascade.
  await db.producto.delete({ where: { id } });

  refrescarVistas(producto.slug);
  redirect("/admin/productos");
}

// --- Imágenes --------------------------------------------------------------

export async function eliminarImagen(formData: FormData): Promise<void> {
  await requireUsuarioEnAccion();

  const id = String(formData.get("imagenId") ?? "");
  const imagen = await db.productoImagen.findUnique({
    where: { id },
    include: { producto: { select: { slug: true } } },
  });
  if (!imagen) return;

  const clave = claveDesdeUrl(imagen.url);
  if (clave) await almacenamiento.borrar(clave);

  await db.productoImagen.delete({ where: { id } });

  refrescarVistas(imagen.producto.slug);
}
