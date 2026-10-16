/**
 * Límite de intentos con ventana deslizante, en memoria.
 *
 * bcrypt con costo 12 hace lento cada intento, pero no impide que alguien deje
 * un script corriendo toda la noche contra el login. Esto sí.
 *
 * ── Alcance y límite conocido ─────────────────────────────────────────────
 * El contador vive en la memoria del proceso. Eso significa que se reinicia
 * cuando se reinicia el servidor, y que no se comparte entre instancias. Para
 * una tienda en un VPS —el escenario de docs/despliegue.md— alcanza y es
 * gratis. Si algún día corre en varias instancias (Vercel escalando), hay que
 * mover el contador a Redis o a una tabla: la interfaz de `registrarIntento` y
 * `estadoDeLimite` no cambia, solo su implementación.
 */

type Ventana = {
  /** Momentos (epoch ms) de los intentos fallidos dentro de la ventana. */
  intentos: number[];
  /** Hasta cuándo está bloqueado, si se pasó del límite. */
  bloqueadoHasta?: number;
};

const MINUTO = 60_000;

export type ReglaLimite = {
  /** Cuántos fallos se toleran dentro de la ventana. */
  maximo: number;
  /** Largo de la ventana en milisegundos. */
  ventanaMs: number;
  /** Cuánto dura el bloqueo una vez superado el máximo. */
  bloqueoMs: number;
};

/**
 * Dos reglas en paralelo:
 *  · por cuenta — frena el ataque dirigido a un correo concreto.
 *  · por IP — frena el barrido de muchos correos desde el mismo origen, que la
 *    regla por cuenta no vería.
 */
export const LIMITE_LOGIN_CUENTA: ReglaLimite = {
  maximo: 5,
  ventanaMs: 15 * MINUTO,
  bloqueoMs: 15 * MINUTO,
};

export const LIMITE_LOGIN_IP: ReglaLimite = {
  maximo: 20,
  ventanaMs: 15 * MINUTO,
  bloqueoMs: 30 * MINUTO,
};

const ventanas = new Map<string, Ventana>();

/** Techo de claves para que un atacante no haga crecer el mapa sin fin. */
const MAXIMO_CLAVES = 10_000;

function limpiarVencidas(ahora: number) {
  for (const [clave, ventana] of ventanas) {
    const vigente =
      (ventana.bloqueadoHasta ?? 0) > ahora || ventana.intentos.length > 0;
    if (!vigente) ventanas.delete(clave);
  }

  // Si aun así el mapa creció demasiado, se descarta lo más viejo. Perder
  // contadores viejos es aceptable; quedarse sin memoria no.
  if (ventanas.size > MAXIMO_CLAVES) {
    const sobrantes = ventanas.size - MAXIMO_CLAVES;
    let borradas = 0;
    for (const clave of ventanas.keys()) {
      ventanas.delete(clave);
      if (++borradas >= sobrantes) break;
    }
  }
}

export type EstadoLimite = {
  bloqueado: boolean;
  /** Segundos que faltan para poder reintentar. */
  esperaSegundos: number;
  /** Intentos que quedan antes del bloqueo. */
  restantes: number;
};

function evaluar(clave: string, regla: ReglaLimite, ahora: number): EstadoLimite {
  const ventana = ventanas.get(clave);
  if (!ventana) {
    return { bloqueado: false, esperaSegundos: 0, restantes: regla.maximo };
  }

  if (ventana.bloqueadoHasta && ventana.bloqueadoHasta > ahora) {
    return {
      bloqueado: true,
      esperaSegundos: Math.ceil((ventana.bloqueadoHasta - ahora) / 1000),
      restantes: 0,
    };
  }

  const vigentes = ventana.intentos.filter((t) => ahora - t < regla.ventanaMs);
  return {
    bloqueado: false,
    esperaSegundos: 0,
    restantes: Math.max(0, regla.maximo - vigentes.length),
  };
}

/** ¿Puede intentar? No cuenta el intento; solo consulta. */
export function estadoDeLimite(
  clave: string,
  regla: ReglaLimite
): EstadoLimite {
  return evaluar(clave, regla, Date.now());
}

/**
 * Anota un intento FALLIDO y devuelve el estado resultante.
 * Los intentos exitosos no se anotan: se limpian con `limpiarLimite`.
 */
export function registrarFallo(clave: string, regla: ReglaLimite): EstadoLimite {
  const ahora = Date.now();
  limpiarVencidas(ahora);

  const ventana = ventanas.get(clave) ?? { intentos: [] };
  ventana.intentos = ventana.intentos.filter((t) => ahora - t < regla.ventanaMs);
  ventana.intentos.push(ahora);

  if (ventana.intentos.length >= regla.maximo) {
    ventana.bloqueadoHasta = ahora + regla.bloqueoMs;
    ventana.intentos = [];
  }

  ventanas.set(clave, ventana);
  return evaluar(clave, regla, ahora);
}

/** Borra el contador. Se llama cuando alguien entra bien. */
export function limpiarLimite(clave: string): void {
  ventanas.delete(clave);
}

/** Texto para el usuario: "15 minutos" / "45 segundos". */
export function textoDeEspera(segundos: number): string {
  if (segundos >= 60) {
    const minutos = Math.ceil(segundos / 60);
    return `${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  }
  return `${Math.max(1, segundos)} segundos`;
}

/** Solo para pruebas: vacía todos los contadores. */
export function reiniciarLimites(): void {
  ventanas.clear();
}
