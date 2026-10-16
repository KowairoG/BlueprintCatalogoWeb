import type { Metadata } from "next";
import { EncabezadoPanel, Insignia, Tarjeta } from "@/components/ui/Panel";
import { ETIQUETA_ROL, esRol } from "@/lib/constantes";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import {
  BotonEliminarUsuario,
  FormularioUsuario,
} from "@/features/usuarios/components/FormularioUsuario";

export const metadata: Metadata = { title: "Usuarios" };

export default async function PaginaUsuarios() {
  // Solo ADMIN. Un EDITOR que llegue por URL directa recibe un error, no la
  // página: la barrera está en el servidor, no en esconder el enlace del menú.
  const sesion = await requireAdmin();

  const usuarios = await db.usuario.findMany({
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
  });

  return (
    <>
      <EncabezadoPanel
        titulo="Usuarios"
        descripcion="Quién puede entrar al panel. No hay registro público: las cuentas se crean solo desde acá."
      />

      <div className="mb-6">
        <Tarjeta titulo="Crear cuenta">
          <FormularioUsuario />
        </Tarjeta>
      </div>

      <div className="flex flex-col gap-4">
        {usuarios.map((usuario) => {
          const rol = esRol(usuario.rol) ? usuario.rol : "EDITOR";
          const esUnoMismo = usuario.id === sesion.usuarioId;

          return (
            <section
              key={usuario.id}
              className="rounded-2xl border border-borde bg-carbon px-5 py-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">
                    {usuario.nombre}
                    {esUnoMismo && (
                      <span className="ml-2 text-[0.78rem] font-normal text-tenue">
                        (vos)
                      </span>
                    )}
                  </h2>
                  <p className="truncate text-[0.82rem] text-tenue">
                    {usuario.email}
                  </p>
                </div>
                <Insignia tono={rol === "ADMIN" ? "naranja" : "neutro"}>
                  {ETIQUETA_ROL[rol]}
                </Insignia>
                <Insignia tono={usuario.activo ? "verde" : "rojo"}>
                  {usuario.activo ? "Activa" : "Desactivada"}
                </Insignia>
              </div>

              <details className="group mt-3">
                <summary className="cursor-pointer list-none text-[0.82rem] text-tenue hover:text-naranja">
                  <span className="group-open:hidden">✎ Editar</span>
                  <span className="hidden group-open:inline">✕ Cerrar</span>
                </summary>
                <div className="mt-4 flex flex-col gap-5 border-t border-borde pt-4">
                  <FormularioUsuario
                    valores={{
                      id: usuario.id,
                      nombre: usuario.nombre,
                      email: usuario.email,
                      rol,
                      activo: usuario.activo,
                    }}
                  />
                  {!esUnoMismo && <BotonEliminarUsuario id={usuario.id} />}
                </div>
              </details>
            </section>
          );
        })}
      </div>
    </>
  );
}
