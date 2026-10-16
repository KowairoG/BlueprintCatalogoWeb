/**
 * Guardas de configuración.
 *
 * El problema que resuelve este archivo: los valores de ejemplo son cómodos
 * para arrancar y peligrosos para publicar. El `SESSION_SECRET` del
 * `.env.example` mide más de 32 caracteres, así que una validación de largo lo
 * aprueba y da falsa confianza; y el usuario administrador inicial está
 * publicado en el README, donde cualquiera lo lee.
 *
 * En desarrollo se avisa. En producción se corta el arranque: es preferible un
 * despliegue que falla con un mensaje claro a un panel abierto al mundo con la
 * contraseña que sale en la documentación.
 */

/** Valores que vienen en .env.example y en el seed. Nunca deben llegar a producción. */
export const VALORES_DE_EJEMPLO = {
  secreto: "cambiame-por-una-clave-larga-y-aleatoria",
  password: "tienda2026",
  email: "admin@tienda.local",
} as const;

export const LARGO_MINIMO_SECRETO = 32;

export function esProduccion(): boolean {
  return process.env.NODE_ENV === "production";
}

const COMO_GENERAR_SECRETO =
  'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"';

/**
 * Verifica el SESSION_SECRET.
 * Devuelve el secreto válido o lanza con una explicación de qué hacer.
 */
export function verificarSecretoDeSesion(): string {
  const secreto = process.env.SESSION_SECRET;

  if (!secreto) {
    throw new Error(
      `Falta SESSION_SECRET. Copiá .env.example como .env y generá una clave con:\n  ${COMO_GENERAR_SECRETO}`
    );
  }

  if (secreto.length < LARGO_MINIMO_SECRETO) {
    throw new Error(
      `SESSION_SECRET es muy corta (${secreto.length} caracteres, mínimo ${LARGO_MINIMO_SECRETO}). Generá una con:\n  ${COMO_GENERAR_SECRETO}`
    );
  }

  // El chequeo que la validación de largo no puede hacer: el placeholder es
  // largo, pero es público.
  if (secreto === VALORES_DE_EJEMPLO.secreto) {
    const mensaje =
      `SESSION_SECRET todavía tiene el valor de ejemplo, que es público: cualquiera podría falsificar una sesión del panel.\nGenerá uno propio con:\n  ${COMO_GENERAR_SECRETO}`;

    if (esProduccion()) throw new Error(mensaje);
    console.warn(`\n⚠  ${mensaje}\n`);
  }

  return secreto;
}

/**
 * Verifica las credenciales del administrador inicial antes de crearlo.
 * La usa el seed.
 */
export function verificarAdminInicial(email: string, password: string): void {
  const usaEjemplo =
    password === VALORES_DE_EJEMPLO.password ||
    email === VALORES_DE_EJEMPLO.email;

  if (!usaEjemplo) return;

  const mensaje =
    "El administrador inicial usa el correo o la contraseña de ejemplo, que están publicados en el README.\n" +
    "Cambiá ADMIN_EMAIL y ADMIN_PASSWORD en el archivo .env antes de correr el seed en producción.";

  if (esProduccion()) throw new Error(mensaje);
  console.warn(`\n⚠  ${mensaje}\n`);
}
