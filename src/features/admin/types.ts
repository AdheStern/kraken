// src/features/admin/types.ts
// Tipos de presentación de la administración (nunca entidades Prisma completas).
import type { RoleCode } from "@/generated/prisma/enums";
import type { RoleAreaRule } from "./role-area-rules";

export type SimpleCatalogItem = {
  id: string;
  name: string;
  code: string | null;
  taxId: string | null;
  isHours: boolean | null;
  isActive: boolean;
};

export type CustomerRow = {
  id: string;
  name: string;
  taxId: string | null;
  city: string | null;
  contactCount: number;
  isActive: boolean;
};

export type CustomerContactView = {
  id: string;
  name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

export type CustomerDetail = {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  isActive: boolean;
  contacts: CustomerContactView[];
};

export type ItemTypeCode = "HARDWARE" | "INTANGIBLE" | "SERVICIO";

export type ProductRow = {
  id: string;
  code: string;
  description: string;
  technology: string | null;
  unit: string | null;
  itemType: ItemTypeCode;
  isSerialized: boolean;
  createdFromCv: boolean;
  isActive: boolean;
};

export type ProductDetail = {
  id: string;
  code: string;
  description: string;
  technologyId: string | null;
  unitId: string | null;
  itemType: ItemTypeCode;
  isSerialized: boolean;
  createdFromCv: boolean;
  isActive: boolean;
};

export type CatalogOption = { id: string; label: string };

export type ProductFormOptions = {
  technologies: CatalogOption[];
  units: CatalogOption[];
};

export type UserRoleView = {
  id: string;
  role: string;
  roleName: string;
  areaId: string | null;
  areaCode: string | null;
  source: "ENTRA" | "MANUAL";
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  city: string | null;
  isActive: boolean;
  roles: UserRoleView[];
};

export type UserAdminDetail = UserRow & {
  cityId: string | null;
  jobTitle: string | null;
  isSelf: boolean;
};

export type RoleOption = {
  code: RoleCode;
  name: string;
  areaRule: RoleAreaRule;
};

export type UserAdminOptions = {
  roles: RoleOption[];
  areas: CatalogOption[];
  cities: CatalogOption[];
};

export type ParameterView = {
  key: string;
  text: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type FxRateView = {
  effectiveOn: string;
  buyRate: string;
  sellRate: string;
  source: "CUCU" | "MANUAL";
  fetchedAt: string;
  createdBy: string | null;
};

export type FxPanel = {
  today: string;
  current: FxRateView | null;
  previousSellRate: string | null;
  series: { date: string; sellRate: string }[];
  monthAverage: {
    saleFxRate: string;
    costFxRate: string;
    versions: number;
  } | null;
  history: FxRateView[];
};

export type EntraGroupView = {
  entraGroupId: string;
  groupName: string;
  roles: {
    id: string;
    roleName: string;
    areaCode: string | null;
    people: number;
  }[];
};

export type MailStatus = {
  transport: { name: string; detail: string; ready: boolean };
  pending: number;
  oldestPendingAt: string | null;
  sentToday: number;
  failed: {
    id: string;
    recipientEmail: string;
    subject: string;
    attempts: number;
    lastError: string | null;
    createdAt: string;
  }[];
};
