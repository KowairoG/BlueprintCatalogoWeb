-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_productos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "emoji" TEXT,
    "precio" INTEGER NOT NULL,
    "precioAnterior" INTEGER,
    "mostrarPrecio" BOOLEAN,
    "etiqueta" TEXT,
    "publicado" BOOLEAN NOT NULL DEFAULT true,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "busqueda" TEXT NOT NULL DEFAULT '',
    "codigoExterno" TEXT,
    "categoriaId" TEXT NOT NULL,
    "marcaId" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "productos_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marcas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_productos" ("actualizadoEn", "categoriaId", "codigoExterno", "creadoEn", "descripcion", "destacado", "emoji", "etiqueta", "id", "marcaId", "mostrarPrecio", "nombre", "precio", "precioAnterior", "publicado", "sku", "slug") SELECT "actualizadoEn", "categoriaId", "codigoExterno", "creadoEn", "descripcion", "destacado", "emoji", "etiqueta", "id", "marcaId", "mostrarPrecio", "nombre", "precio", "precioAnterior", "publicado", "sku", "slug" FROM "productos";
DROP TABLE "productos";
ALTER TABLE "new_productos" RENAME TO "productos";
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");
CREATE UNIQUE INDEX "productos_slug_key" ON "productos"("slug");
CREATE INDEX "productos_categoriaId_idx" ON "productos"("categoriaId");
CREATE INDEX "productos_marcaId_idx" ON "productos"("marcaId");
CREATE INDEX "productos_publicado_idx" ON "productos"("publicado");
CREATE INDEX "productos_codigoExterno_idx" ON "productos"("codigoExterno");
CREATE INDEX "productos_busqueda_idx" ON "productos"("busqueda");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
