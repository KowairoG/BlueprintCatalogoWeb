import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import { FormularioLogin } from "@/features/auth/components/FormularioLogin";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default async function PaginaLogin({
  searchParams,
}: PageProps<"/login">) {
  const { destino } = await searchParams;
  const destinoSeguro =
    typeof destino === "string" && destino.startsWith("/") && !destino.startsWith("//")
      ? destino
      : "/admin";

  const configuracion = await obtenerConfiguracion();

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-[400px]">
        <Logo
          marca={configuracion}
          tamano="lg"
          className="mb-8 justify-center"
        />

        <div className="rounded-2xl border border-borde bg-carbon p-7">
          <h1 className="text-xl font-extrabold">Panel de administración</h1>
          <p className="mt-1.5 mb-6 text-[0.88rem] text-tenue">
            Entrá para administrar el catálogo y las existencias.
          </p>

          <FormularioLogin destino={destinoSeguro} />
        </div>

        <p className="mt-6 text-center text-[0.82rem] text-tenue">
          ¿Solo querés ver productos?{" "}
          <Link href="/" className="text-naranja hover:underline">
            Ir al catálogo
          </Link>
        </p>
      </div>
    </main>
  );
}
