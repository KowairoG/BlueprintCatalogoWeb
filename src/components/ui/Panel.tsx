import type { ReactNode } from "react";

/** Piezas de layout que se repiten en todas las pantallas del panel. */

export function EncabezadoPanel({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black tracking-[-0.01em]">{titulo}</h1>
        {descripcion && (
          <p className="mt-1 max-w-[60ch] text-[0.9rem] text-tenue">
            {descripcion}
          </p>
        )}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  );
}

export function Tarjeta({
  titulo,
  descripcion,
  children,
}: {
  titulo?: string;
  descripcion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-borde bg-carbon p-5 sm:p-6">
      {titulo && (
        <h2 className="text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-naranja">
          {titulo}
        </h2>
      )}
      {descripcion && (
        <p className="mt-1.5 text-[0.85rem] text-tenue">{descripcion}</p>
      )}
      <div className={titulo || descripcion ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export function EstadoVacio({
  titulo,
  children,
}: {
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-borde px-6 py-14 text-center">
      <p className="text-[1.05rem] font-bold">{titulo}</p>
      {children && (
        <div className="mx-auto mt-2 max-w-[46ch] text-[0.88rem] text-tenue">
          {children}
        </div>
      )}
    </div>
  );
}

export function Insignia({
  tono = "neutro",
  children,
}: {
  tono?: "neutro" | "naranja" | "verde" | "amarillo" | "rojo";
  children: ReactNode;
}) {
  const tonos = {
    neutro: "border-borde bg-carbon-2 text-tenue",
    naranja: "border-naranja/40 bg-naranja/10 text-naranja",
    verde: "border-verde/40 bg-verde/10 text-verde",
    amarillo: "border-amarillo/40 bg-amarillo/10 text-amarillo",
    rojo: "border-rojo/40 bg-rojo/10 text-rojo",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.06em] ${tonos[tono]}`}
    >
      {children}
    </span>
  );
}
