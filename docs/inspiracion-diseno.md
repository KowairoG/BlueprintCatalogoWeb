# Inspiración de diseño: cetsacr.com

**Pendiente (anotado 2026-09-30).** Rediseñar el catálogo público tomando como
referencia <https://cetsacr.com/> (CETSA Repuestos, Costa Rica). El objetivo es
que se vea como el sitio de un negocio real con trayectoria y **no como una
plantilla generada por IA**.

## Qué tomar de la referencia

- **Barra superior con datos de contacto reales**: teléfono, correo, WhatsApp,
  siempre visibles arriba del logo.
- **Buscador protagonista** en el encabezado, que acepte código interno,
  código OEM / número de parte y nombre.
- **Menú por categorías** del negocio (no genérico), más Marcas, Ofertas,
  Nosotros y Contacto.
- **Banners rotativos** con propuestas de valor concretas del negocio
  (importación directa, garantía, años en el mercado), con llamada a Ofertas.
- **Categorías como mosaicos con foto y conteo de productos**
  (p. ej. "Grupo motor · 3968 productos").
- **Tarjeta de producto de catálogo industrial**: foto, código interno
  (tipo `CT-12345`), marca, estado de existencia ("En stock" / "Sin stock")
  y botón de acción ("Consultar precio" por WhatsApp cuando el cliente no
  quiera publicar precios).
- **Sección de más vendidos / top** y sección de **marcas** que representa.
- **Señales de confianza**: años de trayectoria, cantidad de referencias,
  dirección física, cédula jurídica, horarios, sucursales.
- **Pie de página completo**: razón social, cédula jurídica, dirección,
  enlaces duplicados de navegación, medios de contacto.
- **Estética**: sobria, industrial, tonos oscuros/neutros; textos cortos y
  concretos del rubro ("Calidad constante", "Respaldo de fábrica").

## Qué evitar (lo que delata "hecho con IA")

- Degradados llamativos, emojis decorativos, tarjetas redondeadas genéricas
  con sombras suaves por todos lados.
- Frases vacías tipo "Descubre nuestra increíble selección".
- Secciones de relleno sin datos reales del negocio.

## Cómo encaja con el blueprint

- Todo lo específico (teléfono, cédula jurídica, años, textos de banners,
  "consultar precio" vs. precio visible) debe salir de la **configuración del
  negocio** en el panel, no quedar escrito en el código: el blueprint se clona
  por cliente.
- Mantener el toggle claro/oscuro existente.
