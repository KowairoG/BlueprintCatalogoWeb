// PoC Cloudflare (Fase 0). Config mínima: sin caché incremental en R2 ni
// self-reference todavía (eso es para deploy/ISR; ver docs/plan-migracion-cloudflare.md).
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
