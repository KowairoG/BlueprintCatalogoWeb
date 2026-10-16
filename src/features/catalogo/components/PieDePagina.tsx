import Link from "next/link";

type Sede = {
  id: string;
  nombre: string;
  direccion: string;
  proximamente: boolean;
};

export function PieDePagina({
  nombreNegocio,
  ubicacion,
  sedes,
  telefono,
  horario,
  facebookUrl,
  tiktokUrl,
  marcas,
}: {
  nombreNegocio: string;
  ubicacion: string;
  sedes: Sede[];
  telefono: string;
  horario: string;
  facebookUrl: string;
  tiktokUrl: string;
  marcas: string[];
}) {
  const abiertas = sedes.filter((sede) => !sede.proximamente).length;

  return (
    <footer className="mt-auto border-t border-borde bg-carbon">
      {/* La franja de promesas. COPY A MEDIDA DEL CLIENTE: son argumentos de
          venta, no identidad de marca, así que viven en el código y se editan
          al clonar. Meterlos en la base convertiría el formulario de
          configuración en un editor de contenidos, que es otro proyecto.

          El conteo de sedes sí se calcula: cuando una sede "próximamente"
          abre, el texto se actualiza solo. */}
      <ul className="mx-auto grid max-w-[1240px] gap-4 px-5 py-6 text-center text-[0.82rem] font-semibold sm:grid-cols-2 lg:grid-cols-4">
        <li>Productos originales</li>
        <li>Atención personalizada</li>
        <li>
          {abiertas} {abiertas === 1 ? "sede" : "sedes"} para atenderte
        </li>
        <li>Envíos a todo el país</li>
      </ul>

      <div className="mx-auto grid max-w-[1240px] gap-8 border-t border-borde px-5 py-10 [grid-template-columns:repeat(auto-fit,minmax(215px,1fr))]">
        <div>
          <h2 className="mb-3 text-[0.74rem] font-extrabold tracking-[0.13em] text-naranja uppercase">
            Sedes
          </h2>
          <ul className="flex flex-col gap-1.5 text-[0.87rem] text-tenue">
            {sedes.map((sede) => (
              <li key={sede.id}>
                <b className="font-semibold text-texto">{sede.nombre}</b>
                {sede.proximamente ? (
                  <span className="ml-1.5 rounded-full bg-naranja/15 px-2 py-0.5 text-[0.66rem] font-extrabold text-naranja">
                    Pronto
                  </span>
                ) : (
                  <> — {sede.direccion}</>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-[0.74rem] font-extrabold tracking-[0.13em] text-naranja uppercase">
            Contacto
          </h2>
          <ul className="flex flex-col gap-1.5 text-[0.87rem] text-tenue">
            <li>
              <b className="font-semibold text-texto">Tel / WhatsApp</b> — {telefono}
            </li>
            <li>
              <b className="font-semibold text-texto">Horario</b> — {horario}
            </li>
            <li>
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-naranja"
              >
                Facebook
              </a>
            </li>
            <li>
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-naranja"
              >
                TikTok
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-[0.74rem] font-extrabold tracking-[0.13em] text-naranja uppercase">
            Marcas
          </h2>
          <p className="text-[0.87rem] text-tenue">{marcas.join(" · ")}</p>
        </div>

        <div>
          <h2 className="mb-3 text-[0.74rem] font-extrabold tracking-[0.13em] text-naranja uppercase">
            Servicios
          </h2>
          {/* COPY A MEDIDA DEL CLIENTE, igual que la franja de arriba. */}
          <ul className="flex flex-col gap-1.5 text-[0.87rem] text-tenue">
            <li>Cotización por WhatsApp</li>
            <li>Retiro en sede</li>
            <li>Asesoría para elegir</li>
            <li>Pedidos especiales</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-3 border-t border-borde px-5 py-5 text-[0.78rem] text-tenue">
        <span>
          © {new Date().getFullYear()} {nombreNegocio}
          {ubicacion && ` · ${ubicacion}`}
        </span>
        <Link href="/login" className="hover:text-naranja">
          Administración
        </Link>
      </div>
    </footer>
  );
}
