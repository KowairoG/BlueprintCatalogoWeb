import type { ComponentProps, ReactNode } from "react";

/**
 * Campos de formulario del panel.
 *
 * Todos aceptan `errores` (el array que devuelve Zod para ese campo) y se
 * encargan solos de pintarse en rojo y mostrar el mensaje, para que ningún
 * formulario tenga que repetir esa lógica.
 */

const BASE_CONTROL =
  "w-full rounded-[10px] bg-carbon border px-3.5 py-2.5 text-[0.92rem] " +
  "text-texto font-[inherit] placeholder:text-tenue transition-colors " +
  "focus:outline-none focus:border-naranja focus:bg-carbon-2 " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

function borde(hayError: boolean) {
  return hayError ? "border-rojo" : "border-borde";
}

type PropsEnvoltura = {
  etiqueta: string;
  htmlFor?: string;
  ayuda?: ReactNode;
  errores?: string[];
  requerido?: boolean;
  children: ReactNode;
};

export function Campo({
  etiqueta,
  htmlFor,
  ayuda,
  errores,
  requerido,
  children,
}: PropsEnvoltura) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-tenue"
      >
        {etiqueta}
        {requerido && <span className="ml-1 text-naranja">*</span>}
      </label>
      {children}
      {ayuda && <p className="text-[0.78rem] text-tenue">{ayuda}</p>}
      {errores?.map((error) => (
        <p key={error} className="text-[0.78rem] text-rojo">
          {error}
        </p>
      ))}
    </div>
  );
}

type PropsTexto = ComponentProps<"input"> & {
  etiqueta: string;
  ayuda?: ReactNode;
  errores?: string[];
};

export function CampoTexto({
  etiqueta,
  ayuda,
  errores,
  id,
  name,
  className,
  ...resto
}: PropsTexto) {
  const identificador = id ?? name;
  return (
    <Campo
      etiqueta={etiqueta}
      htmlFor={identificador}
      ayuda={ayuda}
      errores={errores}
      requerido={resto.required}
    >
      <input
        id={identificador}
        name={name}
        aria-invalid={errores && errores.length > 0}
        className={[BASE_CONTROL, borde(!!errores?.length), className]
          .filter(Boolean)
          .join(" ")}
        {...resto}
      />
    </Campo>
  );
}

type PropsArea = ComponentProps<"textarea"> & {
  etiqueta: string;
  ayuda?: ReactNode;
  errores?: string[];
};

export function CampoArea({
  etiqueta,
  ayuda,
  errores,
  id,
  name,
  className,
  ...resto
}: PropsArea) {
  const identificador = id ?? name;
  return (
    <Campo
      etiqueta={etiqueta}
      htmlFor={identificador}
      ayuda={ayuda}
      errores={errores}
      requerido={resto.required}
    >
      <textarea
        id={identificador}
        name={name}
        aria-invalid={errores && errores.length > 0}
        className={[BASE_CONTROL, borde(!!errores?.length), "resize-y", className]
          .filter(Boolean)
          .join(" ")}
        {...resto}
      />
    </Campo>
  );
}

type PropsSelect = ComponentProps<"select"> & {
  etiqueta: string;
  ayuda?: ReactNode;
  errores?: string[];
};

export function CampoSelect({
  etiqueta,
  ayuda,
  errores,
  id,
  name,
  className,
  children,
  ...resto
}: PropsSelect) {
  const identificador = id ?? name;
  return (
    <Campo
      etiqueta={etiqueta}
      htmlFor={identificador}
      ayuda={ayuda}
      errores={errores}
      requerido={resto.required}
    >
      <select
        id={identificador}
        name={name}
        aria-invalid={errores && errores.length > 0}
        className={[BASE_CONTROL, borde(!!errores?.length), "cursor-pointer", className]
          .filter(Boolean)
          .join(" ")}
        {...resto}
      >
        {children}
      </select>
    </Campo>
  );
}

type PropsCasilla = Omit<ComponentProps<"input">, "type"> & {
  etiqueta: string;
  ayuda?: ReactNode;
};

export function CampoCasilla({
  etiqueta,
  ayuda,
  id,
  name,
  className,
  ...resto
}: PropsCasilla) {
  const identificador = id ?? name;
  return (
    <div className="flex gap-3">
      <input
        type="checkbox"
        id={identificador}
        name={name}
        className={[
          "mt-1 size-4 shrink-0 cursor-pointer accent-[var(--color-naranja)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...resto}
      />
      <div className="flex flex-col">
        <label
          htmlFor={identificador}
          className="cursor-pointer text-[0.9rem] font-semibold text-texto"
        >
          {etiqueta}
        </label>
        {ayuda && <p className="text-[0.78rem] text-tenue">{ayuda}</p>}
      </div>
    </div>
  );
}
