/**
 * Links de WhatsApp con mensaje prellenado.
 *
 * La conversión pasa por WhatsApp, no por un carrito. Que el cliente llegue con
 * el producto y el código ya escritos elimina el ida y vuelta de preguntas
 * básicas que consumen tiempo de atención.
 */

export type DatosCotizacion = {
  nombre: string;
  sku?: string | null;
  sedeNombre?: string | null;
  url?: string | null;
};

function limpiarNumero(whatsapp: string): string {
  return whatsapp.replace(/[^\d]/g, "");
}

export function linkWhatsapp(whatsapp: string, mensaje?: string): string {
  const numero = limpiarNumero(whatsapp);
  const base = `https://wa.me/${numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

export function linkCotizacion(
  whatsapp: string,
  { nombre, sku, sedeNombre, url }: DatosCotizacion
): string {
  const partes = [`Hola! Me interesa este producto: ${nombre}`];
  if (sku) partes.push(`Código: ${sku}`);
  if (sedeNombre) partes.push(`Sede: ${sedeNombre}`);
  if (url) partes.push(url);
  partes.push("¿Me pueden pasar precio y disponibilidad?");

  return linkWhatsapp(whatsapp, partes.join("\n"));
}

export function linkConsultaGeneral(whatsapp: string): string {
  return linkWhatsapp(
    whatsapp,
    "Hola! Vengo del catálogo en línea y quiero hacer una consulta."
  );
}
