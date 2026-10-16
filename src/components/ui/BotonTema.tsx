"use client";

import { useSyncExternalStore } from "react";

type Tema = "claro" | "oscuro";

const CLAVE = "tema";

/**
 * Botón flotante para alternar entre modo claro y oscuro.
 *
 * El tema por defecto sigue la preferencia del sistema (lo resuelve el CSS con
 * prefers-color-scheme). Al pulsar el botón se fuerza un tema escribiendo
 * data-theme en <html>, y la elección se recuerda en localStorage. El script
 * inline del layout aplica ese valor antes del primer pintado para que no haya
 * parpadeo en cargas completas.
 *
 * El tema efectivo se lee con useSyncExternalStore, no con useState + effect:
 * así no hay un setState dentro de un effect (que la regla react-hooks marca) y
 * la hidratación queda consistente sola. En el servidor y durante la
 * hidratación se usa el snapshot fijo `snapshotServidor` —el servidor no conoce
 * el localStorage ni el prefers del cliente—; ya montado, `leerEfectivo`
 * devuelve el tema real y, si difiere, React vuelve a renderizar una vez.
 */
function leerEfectivo(): Tema {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light") return "claro";
  if (attr === "dark") return "oscuro";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "oscuro"
    : "claro";
}

/**
 * Snapshot para SSR e hidratación. Tiene que ser idéntico en servidor y cliente
 * para no romper la hidratación; el diseño base es oscuro, así que ese es el
 * valor estable de arranque (coincide con el ícono ☀️ que se pinta por defecto).
 */
function snapshotServidor(): Tema {
  return "oscuro";
}

function suscribir(alCambiar: () => void): () => void {
  // Al montar, re-aplica la preferencia guardada. En desarrollo el remount de
  // Strict Mode limpia los atributos de <html> y borraría el que puso el script
  // inline del layout; esto lo restablece. En producción es casi un no-op.
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === "dark" || guardado === "light") {
      document.documentElement.setAttribute("data-theme", guardado);
    }
  } catch {}
  // Fuerza una relectura tras (re)aplicar el atributo y tras hidratar: si el
  // tema real difiere del snapshot de servidor, React re-renderiza acá.
  alCambiar();

  // Si el usuario no ha elegido tema, seguir los cambios del sistema.
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const alCambiarSistema = () => {
    try {
      if (localStorage.getItem(CLAVE) === null) alCambiar();
    } catch {}
  };

  mq.addEventListener("change", alCambiarSistema);
  // El botón dispara este evento al alternar, para que el store se entere.
  window.addEventListener("tema-cambiado", alCambiar);

  return () => {
    mq.removeEventListener("change", alCambiarSistema);
    window.removeEventListener("tema-cambiado", alCambiar);
  };
}

export function BotonTema() {
  const tema = useSyncExternalStore(suscribir, leerEfectivo, snapshotServidor);

  function alternar() {
    const siguiente: Tema = tema === "oscuro" ? "claro" : "oscuro";
    const valor = siguiente === "oscuro" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", valor);
    try {
      localStorage.setItem(CLAVE, valor);
    } catch {}
    window.dispatchEvent(new Event("tema-cambiado"));
  }

  const etiqueta =
    tema === "oscuro" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={etiqueta}
      title={etiqueta}
      className="fixed bottom-4 right-4 z-50 grid h-11 w-11 place-items-center rounded-full border border-borde bg-carbon text-texto shadow-lg transition-[background-color,border-color,color,transform] hover:-translate-y-0.5 hover:border-naranja hover:text-naranja"
    >
      <span aria-hidden className="text-lg leading-none">
        {tema === "claro" ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
