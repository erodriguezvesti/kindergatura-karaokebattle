import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite que el dev server acepte requests (HMR WebSocket + Server Actions)
  // desde 127.0.0.1 y localhost. Sin esto, Next 16 bloquea las acciones cuando
  // el browser está en 127.0.0.1 pero el dev server "canónico" es localhost,
  // por eso el botón Conectar no reacciona ahí.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
