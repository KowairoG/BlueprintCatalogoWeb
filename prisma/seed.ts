import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { textoDeBusqueda } from "../src/features/productos/busqueda";
import { VALORES_DE_EJEMPLO, verificarAdminInicial } from "../src/lib/entorno";
import {
  CANTIDAD_POR_ESTADO,
  CATEGORIAS,
  MARCAS,
  NEGOCIO,
  PRODUCTOS,
  SEDES,
} from "./datos-iniciales";

/**
 * Carga la base con los datos iniciales de prisma/datos-iniciales.ts
 *
 * Es idempotente: se puede correr las veces que haga falta. Usa `upsert` en vez
 * de `create`, así que no duplica nada y no borra lo que el cliente haya
 * agregado después por su cuenta.
 *
 *   npx prisma db seed
 */

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("Falta DATABASE_URL. Copiá .env.example como .env.");
}

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

function aSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Valores genéricos del schema. Si un campo todavía tiene uno de estos, es que
 * nadie lo tocó y el seed puede rellenarlo.
 */
const GENERICOS: Record<string, string> = {
  nombreNegocio: "Mi Negocio",
  nombreCorto: "NEGOCIO",
  rubro: "CATÁLOGO",
  logoEmoji: "🛒",
};

async function cargarConfiguracion() {
  const existente = await db.configuracion.findUnique({ where: { id: "unica" } });

  if (!existente) {
    await db.configuracion.create({ data: { id: "unica", ...NEGOCIO } });
    console.log(`  ✓ identidad del negocio: ${NEGOCIO.nombreNegocio}`);
    return;
  }

  // Solo se rellenan los campos que siguen vacíos o con el valor genérico del
  // schema. Si el cliente ya cambió el teléfono o el aviso desde el panel,
  // volver a correr el seed no se lo pisa.
  const aRellenar = Object.fromEntries(
    Object.entries(NEGOCIO).filter(([campo, valor]) => {
      const actual = (existente as Record<string, unknown>)[campo];
      return (
        typeof actual === "string" &&
        actual !== valor &&
        (actual === "" || actual === GENERICOS[campo])
      );
    })
  );

  if (Object.keys(aRellenar).length === 0) {
    console.log("  · identidad del negocio ya configurada, se deja como está");
    return;
  }

  await db.configuracion.update({ where: { id: "unica" }, data: aRellenar });
  console.log(
    `  ✓ identidad del negocio: se completaron ${Object.keys(aRellenar).join(", ")}`
  );
}

async function cargarSedes() {
  for (const sede of SEDES) {
    await db.sede.upsert({
      where: { slug: sede.slug },
      update: {
        nombre: sede.nombre,
        direccion: sede.direccion,
        telefono: sede.telefono,
        orden: sede.orden,
        proximamente: sede.proximamente,
      },
      create: { ...sede },
    });
  }
  console.log(`  ✓ ${SEDES.length} sedes`);
}

async function cargarMarcas() {
  for (const marca of MARCAS) {
    await db.marca.upsert({
      where: { slug: marca.slug },
      update: { nombre: marca.nombre, orden: marca.orden },
      create: { ...marca },
    });
  }
  console.log(`  ✓ ${MARCAS.length} marcas`);
}

async function cargarCategorias() {
  let subtotal = 0;

  for (const [indice, categoria] of CATEGORIAS.entries()) {
    const madre = await db.categoria.upsert({
      where: { slug: categoria.slug },
      update: {
        nombre: categoria.nombre,
        icono: categoria.icono,
        descripcion: categoria.descripcion,
        orden: indice + 1,
      },
      create: {
        slug: categoria.slug,
        nombre: categoria.nombre,
        icono: categoria.icono,
        descripcion: categoria.descripcion,
        orden: indice + 1,
      },
    });

    for (const [posicion, nombreSub] of categoria.subcategorias.entries()) {
      // El slug lleva el prefijo de la madre porque hay nombres que se repiten
      // entre ramas —casi todo árbol de categorías termina con un "Accesorios"
      // o un "Ofertas" colgando de dos madres distintas— y el slug es único.
      const slugSub = `${categoria.slug}-${aSlug(nombreSub)}`;

      await db.categoria.upsert({
        where: { slug: slugSub },
        update: {
          nombre: nombreSub,
          padreId: madre.id,
          orden: posicion + 1,
        },
        create: {
          slug: slugSub,
          nombre: nombreSub,
          padreId: madre.id,
          orden: posicion + 1,
        },
      });
      subtotal++;
    }
  }

  console.log(
    `  ✓ ${CATEGORIAS.length} categorías madre y ${subtotal} subcategorías`
  );
}

async function cargarProductos() {
  const categorias = new Map(
    (await db.categoria.findMany({ where: { padreId: null } })).map((c) => [
      c.slug,
      c,
    ])
  );
  const marcas = new Map((await db.marca.findMany()).map((m) => [m.slug, m]));
  const sedes = new Map((await db.sede.findMany()).map((s) => [s.slug, s.id]));

  for (const producto of PRODUCTOS) {
    const categoria = categorias.get(producto.categoria);
    const marca = marcas.get(producto.marca);

    if (!categoria) {
      throw new Error(
        `El producto "${producto.nombre}" apunta a la categoría "${producto.categoria}", que no existe.`
      );
    }

    const datos = {
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      emoji: producto.emoji,
      precio: producto.precio,
      precioAnterior: producto.precioAnterior,
      etiqueta: producto.etiqueta,
      categoriaId: categoria.id,
      marcaId: marca?.id ?? null,
      publicado: true,
      destacado: producto.etiqueta === "TOP",
      busqueda: textoDeBusqueda({
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        sku: producto.sku,
        marcaNombre: marca?.nombre,
        categoriaNombre: categoria.nombre,
      }),
    };

    const guardado = await db.producto.upsert({
      where: { sku: producto.sku },
      update: datos,
      create: { ...datos, sku: producto.sku, slug: aSlug(producto.nombre) },
    });

    for (const [slugSede, estado] of Object.entries(producto.stock)) {
      const sedeId = sedes.get(slugSede);
      if (!sedeId) continue;

      const cantidad = CANTIDAD_POR_ESTADO[estado];
      await db.existencia.upsert({
        where: {
          productoId_sedeId: { productoId: guardado.id, sedeId },
        },
        update: { cantidad },
        create: { productoId: guardado.id, sedeId, cantidad },
      });
    }
  }

  console.log(`  ✓ ${PRODUCTOS.length} productos con existencias por sede`);
}

async function cargarAdmin() {
  // Los respaldos son los mismos valores que vigila `verificarAdminInicial`.
  // Si fueran otros, correr el seed sin .env crearía un admin con credenciales
  // conocidas que la guarda no reconoce y por lo tanto no bloquea.
  const email = (
    process.env.ADMIN_EMAIL ?? VALORES_DE_EJEMPLO.email
  ).toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? VALORES_DE_EJEMPLO.password;
  const nombre = process.env.ADMIN_NOMBRE ?? "Administrador";

  // En producción esto corta el seed: el usuario de ejemplo está en el README.
  verificarAdminInicial(email, password);

  const existente = await db.usuario.findUnique({ where: { email } });

  if (existente) {
    // No se le pisa la contraseña a un usuario que ya existe: si el cliente la
    // cambió desde el panel, correr el seed otra vez no debe revertirla.
    console.log(`  · el administrador ${email} ya existe, se deja como está`);
    return;
  }

  await db.usuario.create({
    data: {
      email,
      nombre,
      passwordHash: await bcrypt.hash(password, 12),
      rol: "ADMIN",
    },
  });

  console.log(`  ✓ administrador creado: ${email} / ${password}`);
  console.log("    ↑ cambiá esta contraseña desde /admin/usuarios");
}

async function main() {
  console.log(`\nCargando datos de ${NEGOCIO.nombreNegocio}…\n`);

  await cargarConfiguracion();
  await cargarSedes();
  await cargarMarcas();
  await cargarCategorias();
  await cargarProductos();
  await cargarAdmin();

  console.log("\nListo. Arrancá con: npm run dev\n");
}

main()
  .catch((error) => {
    console.error("\nEl seed falló:\n", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
