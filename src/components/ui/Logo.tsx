import Image from "next/image";
import Link from "next/link";

/**
 * Logo del negocio.
 *
 * No tiene ningún texto propio: todo viene de la tabla `Configuracion`. Es el
 * único lugar donde se dibuja la marca, así que clonar el proyecto a otra
 * tienda no obliga a buscar el nombre repartido por varios componentes.
 *
 * Si hay un archivo de logo se usa ese; si no, un emoji dentro de un círculo.
 * El respaldo existe para que el sitio nunca se vea roto por una imagen que
 * falta —recién instalado, o si alguien borra el archivo.
 */

export type MarcaVisual = {
  nombreCorto: string;
  rubro: string;
  logoEmoji: string;
  logoUrl?: string;
};

const TAMANOS = {
  sm: { marca: 36, rubro: "text-[0.72rem]", nombre: "text-[1rem]" },
  md: { marca: 42, rubro: "text-[0.9rem]", nombre: "text-[1.1rem]" },
  lg: { marca: 48, rubro: "text-[0.95rem]", nombre: "text-[1.15rem]" },
} as const;

export function Logo({
  marca,
  href = "/",
  tamano = "md",
  className,
}: {
  marca: MarcaVisual;
  href?: string;
  tamano?: keyof typeof TAMANOS;
  className?: string;
}) {
  const estilo = TAMANOS[tamano];

  return (
    <Link
      href={href}
      className={["flex shrink-0 items-center gap-3", className]
        .filter(Boolean)
        .join(" ")}
    >
      {marca.logoUrl ? (
        <Image
          src={marca.logoUrl}
          alt=""
          width={estilo.marca}
          height={estilo.marca}
          // `contain` y no `cover`: un logo recortado deja de ser el logo.
          className="object-contain"
          style={{ width: estilo.marca, height: estilo.marca }}
          priority
        />
      ) : (
        <span
          aria-hidden
          className="grid place-items-center rounded-full border-2 border-naranja bg-gradient-to-br from-[var(--grad-alto)] to-carbon"
          style={{
            width: estilo.marca,
            height: estilo.marca,
            fontSize: estilo.marca * 0.48,
          }}
        >
          {marca.logoEmoji}
        </span>
      )}

      <span className="leading-none">
        <span
          className={`block font-extrabold tracking-[0.06em] ${estilo.rubro}`}
        >
          {marca.rubro}
        </span>
        <span
          className={`block font-black tracking-[0.12em] text-naranja ${estilo.nombre}`}
        >
          {marca.nombreCorto}
        </span>
      </span>
    </Link>
  );
}
