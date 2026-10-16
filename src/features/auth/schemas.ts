import { z } from "zod";
import { ROLES } from "@/lib/constantes";
import { LARGO_MINIMO_PASSWORD } from "@/features/auth/password";

export const esquemaLogin = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Escribí tu correo.")
    .email("Ese correo no tiene un formato válido."),
  password: z.string().min(1, "Escribí tu contraseña."),
});

export const esquemaUsuarioNuevo = z.object({
  nombre: z.string().trim().min(2, "El nombre es muy corto."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "El correo es obligatorio.")
    .email("Ese correo no tiene un formato válido."),
  password: z
    .string()
    .min(LARGO_MINIMO_PASSWORD, `Mínimo ${LARGO_MINIMO_PASSWORD} caracteres.`),
  rol: z.enum(ROLES),
  activo: z.boolean(),
});

export const esquemaUsuarioEdicion = esquemaUsuarioNuevo.extend({
  // Al editar, dejar la contraseña vacía significa "no la cambiés".
  password: z
    .string()
    .refine(
      (v) => v === "" || v.length >= LARGO_MINIMO_PASSWORD,
      `Mínimo ${LARGO_MINIMO_PASSWORD} caracteres, o dejalo vacío para no cambiarla.`
    ),
});

export type DatosLogin = z.infer<typeof esquemaLogin>;
export type DatosUsuarioNuevo = z.infer<typeof esquemaUsuarioNuevo>;
export type DatosUsuarioEdicion = z.infer<typeof esquemaUsuarioEdicion>;
