// prisma/seed/dev-catalog-data.ts
// Datos SOLO de desarrollo, encima de los catálogos base (base-catalog-data.ts): proveedores, clientes y
// productos sintéticos (marcados "demo") y los usuarios demo.
import type { ItemType } from "@/generated/prisma/enums";

// POR QUÉ: tecnologías que usan los productos demo y no están en la hoja "Listas".
export const DEV_TECHNOLOGIES = ["HUAWEI", "VEEAM"];

// POR QUÉ: "INGRAM", "INGRAM MICRO" e "INGRAM - INT" son un solo proveedor; la modalidad va en la línea (§2.1).
export const SUPPLIERS = [
  "Ingram Micro",
  "Intcomex",
  "Licencias OnLine",
  "Fabricante directo",
];

export const CUSTOMERS = [
  { name: "Banco Andino S.A. (demo)", taxId: "1000000011", city: "La Paz" },
  { name: "Minera Illimani S.A. (demo)", taxId: "1000000022", city: "La Paz" },
  {
    name: "Cooperativa Chiquitana (demo)",
    taxId: "1000000033",
    city: "Santa Cruz",
  },
  { name: "Clínica del Valle (demo)", taxId: "1000000044", city: "Cochabamba" },
];

type ProductSeed = {
  code: string;
  description: string;
  technology: string | null;
  unit: string;
  itemType: ItemType;
  isSerialized?: boolean;
};

export const PRODUCTS: ProductSeed[] = [
  {
    code: "C9300-48P-E",
    description: "Catalyst 9300 48 puertos PoE+",
    technology: "CISCO",
    unit: "PIEZA",
    itemType: "HARDWARE",
    isSerialized: true,
  },
  {
    code: "C9300-NM-8X",
    description: "Módulo de red 8x10G para Catalyst 9300",
    technology: "CISCO",
    unit: "PIEZA",
    itemType: "HARDWARE",
    isSerialized: true,
  },
  {
    code: "CON-SNT-C93048P",
    description: "Soporte del fabricante 8x5xNBD Catalyst 9300",
    technology: "CISCO",
    unit: "MESES",
    itemType: "INTANGIBLE",
  },
  {
    code: "FG-100F",
    description: "FortiGate 100F",
    technology: "FORTINET",
    unit: "PIEZA",
    itemType: "HARDWARE",
    isSerialized: true,
  },
  {
    code: "FC-10-F100F-950",
    description: "Unified Threat Protection FortiGate 100F (1 año)",
    technology: "FORTINET",
    unit: "UNIDAD",
    itemType: "INTANGIBLE",
  },
  {
    code: "S5735-L48T4X",
    description: "Switch Huawei S5735 48 puertos",
    technology: "HUAWEI",
    unit: "PIEZA",
    itemType: "HARDWARE",
    isSerialized: true,
  },
  {
    code: "M365-E3",
    description: "Microsoft 365 E3 (mensual)",
    technology: "MICROSOFT",
    unit: "MESES",
    itemType: "INTANGIBLE",
  },
  {
    code: "AZ-CONSUMO",
    description: "Consumo Azure (mensual)",
    technology: "MICROSOFT",
    unit: "MESES",
    itemType: "INTANGIBLE",
  },
  {
    code: "VBR-ENT-PLUS",
    description: "Veeam Backup & Replication Enterprise Plus",
    technology: "VEEAM",
    unit: "UNIDAD",
    itemType: "INTANGIBLE",
  },
  {
    code: "RHEL-SRV-STD",
    description: "Red Hat Enterprise Linux Server Standard (1 año)",
    technology: "REDHAT",
    unit: "UNIDAD",
    itemType: "INTANGIBLE",
  },
  {
    code: "CAB-UTP-CAT6",
    description: "Cable UTP Cat6 (rollo de 305 m)",
    technology: null,
    unit: "ROLLO",
    itemType: "HARDWARE",
  },
  {
    code: "SRV-IMPL",
    description: "Horas de implementación",
    technology: null,
    unit: "HORAS",
    itemType: "SERVICIO",
  },
  {
    code: "SRV-SOP-8X5",
    description: "Bolsa de horas de soporte 8x5",
    technology: null,
    unit: "HORAS",
    itemType: "SERVICIO",
  },
];

export const DEV_USERS = [
  {
    email: "gg@dima.local",
    name: "Gerencia General (demo)",
    role: "GERENTE_GENERAL" as const,
  },
  ...["DIMASOFT", "DIMANET", "DIMATEL", "DIMADOC", "DIMAHELP"].map(
    (areaCode) => ({
      email: `gerente.${areaCode.toLowerCase()}@dima.local`,
      name: `Gerente ${areaCode} (demo)`,
      role: "GERENTE_AREA" as const,
      areaCode,
    }),
  ),
  {
    email: "comercial@dima.local",
    name: "Ana Comercial (demo)",
    role: "COMERCIAL" as const,
  },
  {
    email: "comercial2@dima.local",
    name: "Bruno Comercial (demo)",
    role: "COMERCIAL" as const,
  },
  {
    email: "administracion@dima.local",
    name: "Carla Administración (demo)",
    role: "ADMINISTRACION" as const,
  },
  {
    email: "coordinador@dima.local",
    name: "Diego Coordinador (demo)",
    role: "COORDINADOR_SOPORTE" as const,
    areaCode: "DIMAHELP",
  },
  {
    email: "ingeniero@dima.local",
    name: "Elena Ingeniera (demo)",
    role: "INGENIERO" as const,
    areaCode: "DIMAHELP",
  },
  {
    email: "ingeniero2@dima.local",
    name: "Fabio Ingeniero (demo)",
    role: "INGENIERO" as const,
    areaCode: "DIMANET",
  },
];
