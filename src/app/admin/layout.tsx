import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { cerrarSesion } from "@/features/auth/actions";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import { requireUsuario } from "@/lib/guards";
import { inventario } from "@/lib/inventario";

/**
 * Armazón del panel.
 *
 * El `requireUsuario()` de acá es la primera barrera real (el `proxy.ts` solo
 * redirige rápido). Cada página y cada acción vuelve a verificar por su cuenta.
 */

const ENLACES = [
  { href: "/admin", texto: "Resumen", exacto: true },
  { href: "/admin/productos", texto: "Productos" },
  { href: "/admin/inventario", texto: "Existencias" },
  { href: "/admin/categorias", texto: "Categorías" },
  { href: "/admin/marcas", texto: "Marcas" },
  { href: "/admin/sedes", texto: "Sedes" },
  { href: "/admin/configuracion", texto: "Configuración" },
] as const;

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const sesion = await requireUsuario();
  const configuracion = await obtenerConfiguracion();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-borde bg-carbon lg:w-60 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-1 p-4 lg:sticky lg:top-0 lg:h-dvh">
          <Logo
            marca={{
              // En el panel la línea chica dice "PANEL" en vez del rubro: quien
              // está acá adentro ya sabe qué vende la tienda; lo que necesita
              // saber es que no está en el sitio público.
              rubro: "PANEL",
              nombreCorto: configuracion.nombreCorto,
              logoUrl: configuracion.logoUrl,
              logoEmoji: configuracion.logoEmoji,
            }}
            href="/admin"
            tamano="sm"
            className="mb-4 px-2"
          />

          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {ENLACES.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[0.88rem] font-semibold text-tenue transition-colors hover:bg-carbon-2 hover:text-naranja"
              >
                {enlace.texto}
              </Link>
            ))}
            {sesion.rol === "ADMIN" && (
              <Link
                href="/admin/usuarios"
                className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[0.88rem] font-semibold text-tenue transition-colors hover:bg-carbon-2 hover:text-naranja"
              >
                Usuarios
              </Link>
            )}
          </nav>

          <div className="mt-auto hidden flex-col gap-2 border-t border-borde pt-4 lg:flex">
            {inventario.soloLectura && (
              <p className="rounded-lg border border-amarillo/40 bg-amarillo/10 px-3 py-2 text-[0.72rem] text-amarillo">
                Las existencias vienen de {inventario.nombre} y no se editan
                desde acá.
              </p>
            )}

            <Link
              href="/"
              className="px-3 text-[0.8rem] text-tenue hover:text-naranja"
            >
              ← Ver el sitio público
            </Link>

            <div className="px-3">
              <p className="truncate text-[0.85rem] font-semibold">
                {sesion.nombre}
              </p>
              <p className="truncate text-[0.75rem] text-tenue">
                {sesion.rol === "ADMIN" ? "Administrador" : "Editor"}
              </p>
            </div>

            <form action={cerrarSesion}>
              <button
                type="submit"
                className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-[0.82rem] text-tenue transition-colors hover:bg-carbon-2 hover:text-rojo"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-7 lg:px-9">
        <div className="mx-auto max-w-[1100px]">{children}</div>

        <form action={cerrarSesion} className="mt-10 lg:hidden">
          <button
            type="submit"
            className="cursor-pointer text-[0.82rem] text-tenue hover:text-rojo"
          >
            Cerrar sesión ({sesion.nombre})
          </button>
        </form>
      </main>
    </div>
  );
}
