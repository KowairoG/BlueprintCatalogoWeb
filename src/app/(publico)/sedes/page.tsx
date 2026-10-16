import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { linkConsultaGeneral } from "@/lib/whatsapp";
import { obtenerConfiguracion } from "@/features/configuracion/queries";

/**
 * La descripción se arma con las sedes reales. Escrita a mano se quedaba vieja
 * el día que abrieran o cerraran un local, que es justo lo que este proyecto
 * existe para evitar.
 */
export async function generateMetadata(): Promise<Metadata> {
  const sedes = await db.sede.findMany({
    where: { activa: true },
    orderBy: { orden: "asc" },
    select: { nombre: true, proximamente: true },
  });

  const abiertas = sedes.filter((s) => !s.proximamente).map((s) => s.nombre);
  const proximas = sedes.filter((s) => s.proximamente).map((s) => s.nombre);

  const partes = [`Dónde encontrarnos: ${abiertas.join(", ")}`];
  if (proximas.length > 0) {
    partes.push(`${proximas.join(", ")} próximamente`);
  }

  return { title: "Nuestras sedes", description: partes.join(", más ") + "." };
}

export default async function PaginaSedes() {
  const [sedes, configuracion] = await Promise.all([
    db.sede.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    obtenerConfiguracion(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 py-10">
      <h1 className="text-[1.8rem] font-black sm:text-[2.2rem]">
        Nuestras sedes
      </h1>
      <p className="mt-2 max-w-[60ch] text-tenue">
        No somos una sola tienda de pueblo. Consultá primero el catálogo para
        saber en cuál sede está lo que buscás.
      </p>

      <ul className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {sedes.map((sede) => (
          <li
            key={sede.id}
            className={`flex flex-col rounded-2xl border p-6 ${
              sede.proximamente
                ? "border-dashed border-naranja/40 bg-carbon/50"
                : "border-borde bg-carbon"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[1.15rem] font-extrabold">{sede.nombre}</h2>
              {sede.proximamente && (
                <span className="shrink-0 rounded-full bg-naranja/15 px-2.5 py-0.5 text-[0.68rem] font-extrabold tracking-[0.05em] text-naranja">
                  Próximamente
                </span>
              )}
            </div>

            {/* Dirección en formato tico: así se ubica la gente acá, no con coordenadas. */}
            <p className="mt-2 flex-1 text-[0.9rem] text-tenue">
              {sede.direccion}
            </p>

            {sede.telefono && (
              <a
                href={`tel:${sede.telefono.replace(/\s/g, "")}`}
                className="mt-3 text-[0.88rem] font-semibold hover:text-naranja"
              >
                {sede.telefono}
              </a>
            )}

            {!sede.proximamente && (
              <Link
                href={`/?sede=${sede.slug}`}
                className="mt-4 rounded-[10px] border border-borde px-4 py-2.5 text-center text-[0.85rem] font-bold transition-colors hover:border-naranja hover:text-naranja"
              >
                Ver qué hay en {sede.nombre}
              </Link>
            )}
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-2xl border border-borde bg-carbon p-6">
        <h2 className="text-[1.05rem] font-extrabold">
          ¿No sabés en cuál sede está tu producto?
        </h2>
        <p className="mt-1.5 text-[0.9rem] text-tenue">
          Escribinos y lo confirmamos. Horario: {configuracion.horario}.
        </p>
        <a
          href={linkConsultaGeneral(configuracion.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2.5 rounded-xl bg-wa px-5 py-3 text-[0.9rem] font-extrabold text-wa-oscuro transition-[filter] hover:brightness-110"
        >
          Escribinos por WhatsApp
        </a>
      </section>
    </main>
  );
}
