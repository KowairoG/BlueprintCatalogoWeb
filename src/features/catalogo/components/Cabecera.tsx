import { Logo, type MarcaVisual } from "@/components/ui/Logo";
import { MegaMenu, type CategoriaMenu } from "@/features/catalogo/components/MegaMenu";

/**
 * Cabecera del sitio público.
 *
 * El buscador es el elemento más grande a propósito: en una tienda
 * especializada la gente no navega el catálogo, llega buscando algo concreto.
 * Es la conclusión central de la investigación de UX.
 */

export function Cabecera({
  marca,
  avisoBarra,
  telefono,
  categorias,
  busquedaInicial,
}: {
  marca: MarcaVisual;
  avisoBarra: string;
  telefono: string;
  categorias: CategoriaMenu[];
  busquedaInicial?: string;
}) {
  return (
    <>
      {avisoBarra && (
        <div className="bg-naranja px-4 py-1.5 text-center text-[0.78rem] font-bold uppercase tracking-[0.04em] text-naranja-oscuro">
          {avisoBarra}
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-borde bg-negro/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-4 px-5 py-3.5 sm:gap-6">
          <Logo marca={marca} />

          <form
            action="/"
            method="get"
            className="relative order-3 w-full sm:order-none sm:max-w-[520px] sm:flex-1"
          >
            {/* El placeholder es COPY A MEDIDA DEL CLIENTE: nombrar unos pocos
                productos suyos, como los diría alguien apurado, enseña a usar
                el buscador mejor que cualquier instrucción. */}
            <input
              type="search"
              name="q"
              defaultValue={busquedaInicial}
              aria-label="Buscar productos"
              placeholder="Buscar en el catálogo…"
              className="w-full rounded-[10px] border border-borde bg-carbon px-4 py-2.5 text-[0.92rem] text-texto transition-colors placeholder:text-tenue focus:border-naranja focus:bg-carbon-2 focus:outline-none"
            />
          </form>

          {telefono && (
            <a
              href={`tel:${telefono.replace(/\s/g, "")}`}
              className="ml-auto flex items-center gap-2 rounded-[10px] border border-borde bg-carbon px-4 py-2.5 text-[0.88rem] font-semibold whitespace-nowrap transition-colors hover:border-naranja hover:text-naranja"
            >
              {telefono}
            </a>
          )}
        </div>
      </header>

      <MegaMenu categorias={categorias} />
    </>
  );
}
