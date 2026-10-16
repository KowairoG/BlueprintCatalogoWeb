/**
 * Utilidades de texto. Sin dependencias: se usan tanto en el servidor como en
 * el cliente.
 */

/**
 * Quita tildes y pasa a minúsculas, para que "batería" y "bateria" encuentren
 * lo mismo. Es la búsqueda que ya usaba el prototipo.
 */
export function sinTildes(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Convierte un nombre en un slug apto para URL.
 * "Batería recargable 12V" -> "bateria-recargable-12v"
 */
export function aSlug(texto: string): string {
  return sinTildes(texto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Genera un slug único agregando un sufijo numérico si ya existe.
 * `existe` consulta la base de datos.
 */
export async function slugUnico(
  base: string,
  existe: (slug: string) => Promise<boolean>
): Promise<string> {
  const raiz = aSlug(base) || "producto";
  if (!(await existe(raiz))) return raiz;

  for (let i = 2; i < 500; i++) {
    const candidato = `${raiz}-${i}`;
    if (!(await existe(candidato))) return candidato;
  }

  // Salida de emergencia: prácticamente inalcanzable, pero mejor que un bucle
  // infinito o un slug duplicado que reventaría el índice único.
  return `${raiz}-${Date.now()}`;
}

/** Corta un texto largo sin partir palabras a la mitad. */
export function recortar(texto: string, largo: number): string {
  if (texto.length <= largo) return texto;
  const corte = texto.slice(0, largo);
  const ultimoEspacio = corte.lastIndexOf(" ");
  return (ultimoEspacio > largo * 0.6 ? corte.slice(0, ultimoEspacio) : corte) + "…";
}
