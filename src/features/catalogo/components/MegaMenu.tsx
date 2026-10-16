"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Mega menú de categorías.
 *
 * Muestra la profundidad completa del catálogo en un solo gesto. El árbol
 * viene de la base de datos, así que el negocio lo cambia desde
 * /admin/categorias sin tocar código.
 */

export type CategoriaMenu = {
  id: string;
  slug: string;
  nombre: string;
  icono: string | null;
  descripcion: string | null;
  cantidad: number;
  hijas: { id: string; slug: string; nombre: string }[];
};

export function MegaMenu({ categorias }: { categorias: CategoriaMenu[] }) {
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);

  // Escape cierra el menú: es lo que espera cualquiera que navegue con teclado.
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [abierto]);

  if (categorias.length === 0) return null;

  const categoria = categorias[Math.min(activa, categorias.length - 1)];

  return (
    <nav className="relative z-40 border-b border-borde bg-carbon">
      <div className="mx-auto flex max-w-[1240px] items-stretch gap-1.5 px-5">
        <button
          type="button"
          onClick={() => setAbierto((valor) => !valor)}
          aria-expanded={abierto}
          className="flex cursor-pointer items-center gap-2.5 bg-naranja px-5 py-3.5 text-[0.88rem] font-extrabold tracking-[0.05em] whitespace-nowrap text-naranja-oscuro uppercase"
        >
          ☰ Ver categorías
          <span
            aria-hidden
            className={`text-[0.7rem] transition-transform ${abierto ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </button>

        <Link
          href="/?etiqueta=OFERTA"
          className="hidden items-center px-4 text-[0.86rem] font-semibold whitespace-nowrap text-texto transition-colors hover:text-naranja sm:flex"
        >
          Ofertas
        </Link>
        <Link
          href="/sedes"
          className="hidden items-center px-4 text-[0.86rem] font-semibold whitespace-nowrap text-tenue transition-colors hover:text-naranja sm:flex"
        >
          Nuestras sedes
        </Link>
      </div>

      {abierto && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/50"
            onClick={() => setAbierto(false)}
            aria-hidden
          />

          <div className="absolute inset-x-0 top-full z-40 border-b border-borde bg-carbon shadow-[0_22px_44px_rgba(0,0,0,.55)]">
            <div className="mx-auto grid max-w-[1240px] px-5 lg:grid-cols-[262px_1fr]">
              <ul className="border-borde py-3 lg:border-r">
                {categorias.map((opcion, indice) => (
                  <li key={opcion.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiva(indice)}
                      onFocus={() => setActiva(indice)}
                      onClick={() => setActiva(indice)}
                      className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[0.88rem] font-semibold transition-colors ${
                        indice === activa
                          ? "bg-carbon-2 text-naranja"
                          : "text-tenue hover:bg-carbon-2 hover:text-naranja"
                      }`}
                    >
                      <span aria-hidden className="w-5 text-center">
                        {opcion.icono}
                      </span>
                      {opcion.nombre}
                      <span className="ml-auto text-[0.72rem] text-tenue">
                        {opcion.cantidad}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="px-2 py-6 lg:px-8">
                <h2 className="text-[1.05rem] font-extrabold">
                  <Link
                    href={`/?cat=${categoria.slug}`}
                    onClick={() => setAbierto(false)}
                    className="hover:text-naranja"
                  >
                    {categoria.nombre}
                  </Link>
                </h2>
                {categoria.descripcion && (
                  <p className="mb-5 text-[0.83rem] text-tenue">
                    {categoria.descripcion}
                  </p>
                )}

                <ul className="grid gap-x-6 gap-y-1 [grid-template-columns:repeat(auto-fill,minmax(158px,1fr))]">
                  {categoria.hijas.map((hija) => (
                    <li key={hija.id}>
                      <Link
                        href={`/?cat=${hija.slug}`}
                        onClick={() => setAbierto(false)}
                        className="block py-1 text-[0.85rem] text-tenue transition-[color,padding] hover:pl-1.5 hover:text-naranja"
                      >
                        {hija.nombre}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
