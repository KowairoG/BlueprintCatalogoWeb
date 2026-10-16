-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_configuracion" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'unica',
    "nombreNegocio" TEXT NOT NULL DEFAULT 'Mi Negocio',
    "nombreCorto" TEXT NOT NULL DEFAULT 'NEGOCIO',
    "rubro" TEXT NOT NULL DEFAULT 'CATÁLOGO',
    "logoEmoji" TEXT NOT NULL DEFAULT '🛒',
    "eslogan" TEXT NOT NULL DEFAULT '',
    "ubicacion" TEXT NOT NULL DEFAULT '',
    "descripcionSeo" TEXT NOT NULL DEFAULT '',
    "telefono" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "horario" TEXT NOT NULL DEFAULT '',
    "avisoBarra" TEXT NOT NULL DEFAULT '',
    "facebookUrl" TEXT NOT NULL DEFAULT '',
    "tiktokUrl" TEXT NOT NULL DEFAULT '',
    "mostrarPreciosPorDefecto" BOOLEAN NOT NULL DEFAULT true,
    "actualizadoEn" DATETIME NOT NULL
);
INSERT INTO "new_configuracion" ("actualizadoEn", "avisoBarra", "eslogan", "facebookUrl", "horario", "id", "mostrarPreciosPorDefecto", "nombreNegocio", "telefono", "tiktokUrl", "whatsapp") SELECT "actualizadoEn", "avisoBarra", "eslogan", "facebookUrl", "horario", "id", "mostrarPreciosPorDefecto", "nombreNegocio", "telefono", "tiktokUrl", "whatsapp" FROM "configuracion";
DROP TABLE "configuracion";
ALTER TABLE "new_configuracion" RENAME TO "configuracion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
