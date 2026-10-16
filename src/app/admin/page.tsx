import type { Metadata } from "next";
import Link from "next/link";
import { BotonLink } from "@/components/ui/Boton";
import { Mensaje } from "@/components/ui/Mensaje";
import { EncabezadoPanel, Insignia, Tarjeta } from "@/components/ui/Panel";
import { db } from "@/lib/db";
import { requireUsuario } from "@/lib/guards";
import { LOCALE } from "@/lib/region";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import { listarSedesConStock } from "@/features/productos/queries";

export const metadata: Metadata = { title: "Resumen" };

export default async function PaginaResumen({
  searchParams,
}: PageProps<"/admin">) {
  const sesion = await requireUsuario();
  const { sinPermiso } = await searchParams;

  const [
    configuracion,
    sedes,
    totalProductos,
    publicados,
    sinFoto,
    ultimos,
  ] = await Promise.all([
    obtenerConfiguracion(),
    listarSedesConStock(),
    db.producto.count(),
    db.producto.count({ where: { publicado: true } }),
    db.producto.count({ where: { imagenes: { none: {} } } }),
    db.producto.findMany({
      orderBy: { actualizadoEn: "desc" },
      take: 5,
      select: { id: true, nombre: true, publicado: true, actualizadoEn: true },
    }),
  ]);

  // Cuántos productos están en cero en cada sede: es el dato que dispara la
  // llamada al proveedor.
  const agotadosPorSede = await Promise.all(
    sedes.map(async (sede) => ({
      sede,
      agotados: await db.producto.count({
        where: {
          publicado: true,
          OR: [
            { existencias: { none: { sedeId: sede.id } } },
            { existencias: { some: { sedeId: sede.id, cantidad: { lte: 0 } } } },
          ],
        },
      }),
    }))
  );

  return (
    <>
      <EncabezadoPanel
        titulo={`Hola, ${sesion.nombre.split(" ")[0]}`}
        descripcion="Esto es lo que está pasando con el catálogo."
        acciones={
          <BotonLink href="/admin/productos/nuevo">+ Nuevo producto</BotonLink>
        }
      />

      {sinPermiso && (
        <div className="mb-5">
          <Mensaje tono="aviso">
            Esa sección es solo para administradores. Si necesitás entrar,
            pedile a un administrador que te cambie el rol.
          </Mensaje>
        </div>
      )}

      {!configuracion.mostrarPreciosPorDefecto && (
        <div className="mb-5">
          <Mensaje tono="aviso">
            Los precios están ocultos en el sitio. El catálogo muestra
            &ldquo;Consultar precio&rdquo; y empuja el contacto por WhatsApp.{" "}
            <Link
              href="/admin/configuracion"
              className="underline underline-offset-2"
            >
              Cambiar esto
            </Link>
          </Mensaje>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dato titulo="Productos" valor={totalProductos} pie="en el sistema" />
        <Dato titulo="Publicados" valor={publicados} pie="visibles en el sitio" />
        <Dato
          titulo="Despublicados"
          valor={totalProductos - publicados}
          pie="ocultos del catálogo"
        />
        <Dato titulo="Sin foto" valor={sinFoto} pie="se ven con emoji" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta
          titulo="Agotados por sede"
          descripcion="Productos publicados que están en cero. Son las consultas que van a llegar por WhatsApp."
        >
          <ul className="flex flex-col gap-2">
            {agotadosPorSede.map(({ sede, agotados }) => (
              <li
                key={sede.id}
                className="flex items-center justify-between gap-3 border-b border-borde pb-2 last:border-0 last:pb-0"
              >
                <Link
                  href={`/admin/inventario?sede=${sede.slug}`}
                  className="font-semibold hover:text-naranja"
                >
                  {sede.nombre}
                </Link>
                <Insignia tono={agotados === 0 ? "verde" : "amarillo"}>
                  {agotados === 0 ? "todo con stock" : `${agotados} en cero`}
                </Insignia>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Últimos editados">
          <ul className="flex flex-col gap-2">
            {ultimos.map((producto) => (
              <li
                key={producto.id}
                className="flex items-center justify-between gap-3 border-b border-borde pb-2 last:border-0 last:pb-0"
              >
                <Link
                  href={`/admin/productos/${producto.id}`}
                  className="min-w-0 flex-1 truncate hover:text-naranja"
                >
                  {producto.nombre}
                </Link>
                <span className="shrink-0 text-[0.75rem] text-tenue">
                  {producto.actualizadoEn.toLocaleDateString(LOCALE, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
            {ultimos.length === 0 && (
              <li className="text-[0.85rem] text-tenue">
                Todavía no hay productos cargados.
              </li>
            )}
          </ul>
        </Tarjeta>
      </div>
    </>
  );
}

function Dato({
  titulo,
  valor,
  pie,
}: {
  titulo: string;
  valor: number;
  pie: string;
}) {
  return (
    <div className="rounded-2xl border border-borde bg-carbon px-5 py-4">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-tenue">
        {titulo}
      </p>
      <p className="mt-1 text-3xl font-black text-naranja">{valor}</p>
      <p className="text-[0.78rem] text-tenue">{pie}</p>
    </div>
  );
}
