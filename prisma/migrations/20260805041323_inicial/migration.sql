-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'EDITOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icono" TEXT,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "padreId" TEXT,
    CONSTRAINT "categorias_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "categorias" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "marcas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "sedes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "proximamente" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "productos" (
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
    "codigoExterno" TEXT,
    "categoriaId" TEXT NOT NULL,
    "marcaId" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "productos_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marcas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "producto_imagenes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "producto_imagenes_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "existencias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "umbralBajo" INTEGER NOT NULL DEFAULT 2,
    "origen" TEXT NOT NULL DEFAULT 'local',
    "sincronizadoEn" DATETIME,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "existencias_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "existencias_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'unica',
    "nombreNegocio" TEXT NOT NULL DEFAULT 'Mi Negocio',
    "eslogan" TEXT NOT NULL DEFAULT '',
    "telefono" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "horario" TEXT NOT NULL DEFAULT '',
    "avisoBarra" TEXT NOT NULL DEFAULT '',
    "facebookUrl" TEXT NOT NULL DEFAULT '',
    "tiktokUrl" TEXT NOT NULL DEFAULT '',
    "mostrarPreciosPorDefecto" BOOLEAN NOT NULL DEFAULT true,
    "actualizadoEn" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE INDEX "categorias_padreId_idx" ON "categorias"("padreId");

-- CreateIndex
CREATE INDEX "categorias_orden_idx" ON "categorias"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_nombre_key" ON "marcas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_slug_key" ON "marcas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sedes_slug_key" ON "sedes"("slug");

-- CreateIndex
CREATE INDEX "sedes_orden_idx" ON "sedes"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "productos_slug_key" ON "productos"("slug");

-- CreateIndex
CREATE INDEX "productos_categoriaId_idx" ON "productos"("categoriaId");

-- CreateIndex
CREATE INDEX "productos_marcaId_idx" ON "productos"("marcaId");

-- CreateIndex
CREATE INDEX "productos_publicado_idx" ON "productos"("publicado");

-- CreateIndex
CREATE INDEX "productos_codigoExterno_idx" ON "productos"("codigoExterno");

-- CreateIndex
CREATE INDEX "producto_imagenes_productoId_idx" ON "producto_imagenes"("productoId");

-- CreateIndex
CREATE INDEX "existencias_sedeId_idx" ON "existencias"("sedeId");

-- CreateIndex
CREATE UNIQUE INDEX "existencias_productoId_sedeId_key" ON "existencias"("productoId", "sedeId");
