// prisma/seed/dev-catalog-data.ts
// Catálogos de desarrollo. Ciudades, áreas, unidades y tecnologías vienen de AGENTS.md §1–2;
// clientes y productos son SINTÉTICOS (marcados "demo") hasta la carga real desde la hoja "Listas".
import type { ItemType } from "@/generated/prisma/enums";

export const CITIES = [
  { code: "LP", name: "La Paz" },
  { code: "SC", name: "Santa Cruz" },
  { code: "CB", name: "Cochabamba" },
];

export const AREAS = [
  { code: "DIMASOFT", name: "Software y licenciamiento" },
  { code: "DIMANET", name: "Redes, infraestructura y seguridad" },
  { code: "DIMATEL", name: "Comunicaciones y colaboración" },
  { code: "DIMADOC", name: "Gestión documental e impresión" },
  { code: "DIMAHELP", name: "Mesa de ayuda" },
];

export const UNITS = [
  { code: "HORAS", name: "Horas", isHours: true },
  { code: "MESES", name: "Meses", isHours: false },
  { code: "PIEZA", name: "Pieza", isHours: false },
  { code: "UNIDAD", name: "Unidad", isHours: false },
  { code: "METROS", name: "Metros", isHours: false },
  { code: "ROLLO", name: "Rollo", isHours: false },
];

export const TECHNOLOGIES = [
  "Cisco",
  "Huawei",
  "Radware",
  "Red Hat",
  "Microsoft",
  "IBM",
  "AWS",
  "HPE",
  "Fortinet",
  "Ricoh",
  "Veeam",
  "VMware",
];

// POR QUÉ: "INGRAM", "INGRAM MICRO" e "INGRAM - INT" son un solo proveedor; la modalidad va en la línea (§2.1).
export const SUPPLIERS = [
  "Ingram Micro",
  "Intcomex",
  "Licencias OnLine",
  "Fabricante directo",
];

export const SERVICE_TYPES = [
  "Implementación",
  "Soporte",
  "Licenciamiento",
  "Suministro",
  "Consultoría",
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
    technology: "Cisco",
    unit: "PIEZA",
    itemType: "HARDWARE",
    isSerialized: true,
  },
  {
    code: "C9300-NM-8X",
    description: "Módulo de red 8x10G para Catalyst 9300",
    technology: "Cisco",
    unit: "PIEZA",
    itemType: "HARDWARE",
    isSerialized: true,
  },
  {
    code: "CON-SNT-C93048P",
    description: "Soporte del fabricante 8x5xNBD Catalyst 9300",
    technology: "Cisco",
    unit: "MESES",
    itemType: "INTANGIBLE",
  },
  {
    code: "FG-100F",
    description: "FortiGate 100F",
    technology: "Fortinet",
    unit: "PIEZA",
    itemType: "HARDWARE",
    isSerialized: true,
  },
  {
    code: "FC-10-F100F-950",
    description: "Unified Threat Protection FortiGate 100F (1 año)",
    technology: "Fortinet",
    unit: "UNIDAD",
    itemType: "INTANGIBLE",
  },
  {
    code: "S5735-L48T4X",
    description: "Switch Huawei S5735 48 puertos",
    technology: "Huawei",
    unit: "PIEZA",
    itemType: "HARDWARE",
    isSerialized: true,
  },
  {
    code: "M365-E3",
    description: "Microsoft 365 E3 (mensual)",
    technology: "Microsoft",
    unit: "MESES",
    itemType: "INTANGIBLE",
  },
  {
    code: "AZ-CONSUMO",
    description: "Consumo Azure (mensual)",
    technology: "Microsoft",
    unit: "MESES",
    itemType: "INTANGIBLE",
  },
  {
    code: "VBR-ENT-PLUS",
    description: "Veeam Backup & Replication Enterprise Plus",
    technology: "Veeam",
    unit: "UNIDAD",
    itemType: "INTANGIBLE",
  },
  {
    code: "RHEL-SRV-STD",
    description: "Red Hat Enterprise Linux Server Standard (1 año)",
    technology: "Red Hat",
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

// [CONFIRMAR] valores iniciales pendientes de DIMA (AGENTS.md §14, F1).
export const PARAMETERS = [
  {
    key: "cv.umbral_gg_usd",
    value: "50000.00",
    description: "Total de venta (USD) desde el que aprueba también el GG",
  },
  {
    key: "fx.desvio_max_pct",
    value: "2",
    description:
      "% de desvío del TC ingresado frente al oficial que dispara la advertencia",
  },
];

export const DEV_USERS = [
  {
    email: "gg@dima.local",
    name: "Gerencia General (demo)",
    role: "GERENTE_GENERAL" as const,
  },
  {
    email: "gerente.dimanet@dima.local",
    name: "Gerente DIMANET (demo)",
    role: "GERENTE_AREA" as const,
    areaCode: "DIMANET",
  },
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
];
