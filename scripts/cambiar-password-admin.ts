/**
 * Cambia el correo y la contraseña de un usuario administrador.
 *
 * Existe porque el seed solo crea el usuario la primera vez: si la base ya
 * tiene el admin creado con las credenciales de ejemplo, editar el .env no
 * cambia nada. Esto sí.
 *
 * Uso:
 *   npm run admin:password
 *
 * Pide los datos por teclado y no los muestra en pantalla, así no quedan en el
 * historial de la terminal ni en una captura.
 */

// Va primero y antes que `db`: tsx no lee el .env por su cuenta, y `db` exige
// DATABASE_URL apenas se importa. Mismo motivo que en prisma/seed.ts.
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { db } from "../src/lib/db";
import {
  hashearPassword,
  LARGO_MINIMO_PASSWORD,
} from "../src/features/auth/password";
import { VALORES_DE_EJEMPLO } from "../src/lib/entorno";

/** Lee una línea sin que se vea lo que se escribe. */
async function preguntarOculto(pregunta: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });

  // readline no trae modo oculto: se silencia la salida mientras se escribe.
  const salida = stdout as NodeJS.WriteStream & { muted?: boolean };
  const escribirOriginal = salida.write.bind(salida);

  stdout.write(pregunta);
  salida.write = ((chunk: string | Uint8Array, ...resto: unknown[]) => {
    if (salida.muted) return true;
    return escribirOriginal(chunk as string, ...(resto as []));
  }) as typeof salida.write;
  salida.muted = true;

  try {
    const valor = await rl.question("");
    return valor.trim();
  } finally {
    salida.muted = false;
    salida.write = escribirOriginal;
    stdout.write("\n");
    rl.close();
  }
}

async function preguntar(pregunta: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(pregunta)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const admins = await db.usuario.findMany({
    where: { rol: "ADMIN" },
    select: { id: true, email: true, nombre: true },
    orderBy: { creadoEn: "asc" },
  });

  if (admins.length === 0) {
    console.error(
      "No hay ningún usuario ADMIN en la base. Corré `npm run db:seed` primero."
    );
    process.exitCode = 1;
    return;
  }

  console.log("\nAdministradores en la base:");
  admins.forEach((a, i) => console.log(`  ${i + 1}. ${a.email} (${a.nombre})`));

  let objetivo = admins[0];
  if (admins.length > 1) {
    const elegido = await preguntar(`\n¿Cuál querés cambiar? [1-${admins.length}]: `);
    const indice = Number(elegido) - 1;
    if (!Number.isInteger(indice) || indice < 0 || indice >= admins.length) {
      console.error("Opción inválida.");
      process.exitCode = 1;
      return;
    }
    objetivo = admins[indice];
  }

  console.log(`\nCambiando: ${objetivo.email}`);

  const emailNuevo = await preguntar(
    `Correo nuevo (Enter para dejar "${objetivo.email}"): `
  );

  const email = emailNuevo || objetivo.email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Ese correo no tiene forma de correo.");
    process.exitCode = 1;
    return;
  }

  if (email !== objetivo.email) {
    const ocupado = await db.usuario.findUnique({ where: { email } });
    if (ocupado) {
      console.error("Ya existe un usuario con ese correo.");
      process.exitCode = 1;
      return;
    }
  }

  const password = await preguntarOculto("Contraseña nueva: ");
  if (password.length < LARGO_MINIMO_PASSWORD) {
    console.error(
      `La contraseña necesita al menos ${LARGO_MINIMO_PASSWORD} caracteres.`
    );
    process.exitCode = 1;
    return;
  }

  const repetida = await preguntarOculto("Repetila: ");
  if (password !== repetida) {
    console.error("No coinciden.");
    process.exitCode = 1;
    return;
  }

  if (password === VALORES_DE_EJEMPLO.password) {
    console.error(
      "Esa es justamente la contraseña que estaba publicada. Elegí otra."
    );
    process.exitCode = 1;
    return;
  }

  await db.usuario.update({
    where: { id: objetivo.id },
    data: { email, passwordHash: await hashearPassword(password) },
  });

  console.log(`\n✓ Listo. Ahora entrás con: ${email}`);
  console.log(
    "  Acordate de actualizar ADMIN_EMAIL y ADMIN_PASSWORD en el .env para\n" +
      "  que un `npm run db:seed` futuro no vuelva a crear el de ejemplo.\n"
  );
}

main()
  .catch((error) => {
    console.error("\nFalló el cambio:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
