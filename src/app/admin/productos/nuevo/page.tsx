import type { Metadata } from "next";
import { BotonLink } from "@/components/ui/Boton";
import { EncabezadoPanel } from "@/components/ui/Panel";
import { requireUsuario } from "@/lib/guards";
import { inventario } from "@/lib/inventario";
import { UMBRAL_BAJO_POR_DEFECTO } from "@/lib/stock";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import {
  listarCategoriasPlanas,
  listarMarcas,
  listarSedesConStock,
} from "@/features/productos/queries";
import { FormularioProducto } from "@/features/productos/components/FormularioProducto";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function PaginaNuevoProducto() {
  await requireUsuario();

  const [categorias, marcas, sedes, configuracion] = await Promise.all([
    listarCategoriasPlanas(),
    listarMarcas(),
    listarSedesConStock(),
    obtenerConfiguracion(),
  ]);

  return (
    <>
      <EncabezadoPanel
        titulo="Nuevo producto"
        descripcion="Datos, precio, fotos y existencias de las sedes en una sola pantalla."
        acciones={
          <BotonLink href="/admin/productos" variante="secundario">
            Cancelar
          </BotonLink>
        }
      />

      <FormularioProducto
        modo="crear"
        valores={{
          nombre: "",
          sku: "",
          descripcion: "",
          emoji: "",
          categoriaId: "",
          marcaId: "",
          precio: "",
          precioAnterior: "",
          mostrarPrecio: "",
          etiqueta: "",
          publicado: true,
          destacado: false,
          codigoExterno: "",
        }}
        categorias={categorias.map((categoria) => ({
          id: categoria.id,
          nombre: categoria.nombre,
          grupo: categoria.padre?.nombre,
        }))}
        marcas={marcas.map((marca) => ({ id: marca.id, nombre: marca.nombre }))}
        sedes={sedes.map((sede) => ({
          id: sede.id,
          nombre: sede.nombre,
          cantidad: 0,
          umbralBajo: UMBRAL_BAJO_POR_DEFECTO,
        }))}
        inventarioSoloLectura={inventario.soloLectura}
        nombreInventario={inventario.nombre}
        mostrarPreciosPorDefecto={configuracion.mostrarPreciosPorDefecto}
      />
    </>
  );
}
