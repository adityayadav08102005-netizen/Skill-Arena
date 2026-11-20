/**
 * Optional preload for one-off scripts (seed, make-admin) when your system DNS
 * refuses the SRV lookups that mongodb+srv:// needs ("querySrv ECONNREFUSED"):
 *   node --import ./scripts/public-dns.mjs scripts/seed.mjs
 * Only this Node process uses the public resolvers; nothing else changes.
 */
import dns from "node:dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
