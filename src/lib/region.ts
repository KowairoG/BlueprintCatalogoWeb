/**
 * Configuración regional del sitio.
 *
 * ── Para clonar el proyecto a un negocio de otro país ─────────────────────
 * Se cambia la constante de abajo. Nada más en el código conoce el idioma ni
 * el formato de fecha.
 *
 * La moneda va aparte, en `src/lib/money.ts`: son dos decisiones distintas
 * —hay países que comparten idioma y no moneda— y conviene poder mover una
 * sin tocar la otra.
 */

/**
 * Etiqueta BCP 47. Se usa en el `lang` del documento (que es lo que leen los
 * lectores de pantalla y los buscadores) y en el formato de fechas del panel.
 */
export const LOCALE = "es-CR";
