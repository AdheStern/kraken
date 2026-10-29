// src/app/robots.ts
// robots.txt: Kraken es interna y todo pide sesión; ningún buscador debe rastrearla ni indexarla.
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
