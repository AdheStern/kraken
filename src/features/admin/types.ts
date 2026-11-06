// src/features/admin/types.ts
// Tipos de presentación de la administración (nunca entidades Prisma completas).
import type { CompanyType, RoleCode } from "@/generated/prisma/enums";
import type { RoleAreaRule } from "./role-area-rules";

export type SimpleCatalogItem = {
  id: string;
  name: string;
  code: string | null;
  taxId: string | null;
  isHours: boolean | null;
  isTerm: boolean | null;
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

// Puesto de una persona en el cliente (decisión 2026-11-06); fechas como «yyyy-MM-dd».
export type CustomerContactView = {
  id: string;
  personId: string;
  name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  municipalityId: string | null;
  municipalityLabel: string | null;
  branchId: string | null;
  branchName: string | null;
  areaIds: string[];
  areaCodes: string[];
  userIds: string[];
  userNames: string[];
  startedOn: string | null;
  endedOn: string | null;
  exitReason: string | null;
  isActive: boolean;
};

type Option = { id: string; label: string; hint?: string };

export type ContactFormOptions = {
  municipalities: Option[];
  branches: Option[];
  areas: Option[];
  users: Option[];
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
  industryId: string | null;
  companyType: CompanyType | null;
  municipalityId: string | null;
  isActive: boolean;
  contacts: CustomerContactView[];
  branches: CustomerBranchView[];
};

// Sucursal de un cliente (decisión 2026-11-06); coordenadas como texto exacto (NUMERIC), nunca number.
export type CustomerBranchView = {
  id: string;
  name: string;
  address: string | null;
  municipalityId: string | null;
  municipalityLabel: string | null;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
  isActive: boolean;
};

// Opciones de la ficha del cliente (decisión 2026-11-06); el municipio lleva su departamento como ayuda.
export type CustomerFormOptions = {
  industries: { id: string; label: string }[];
  municipalities: { id: string; label: string; hint: string }[];
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
  createdFromInventory: boolean;
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
  createdFromInventory: boolean;
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

// Cuenta del portal de una empresa cliente (§2.11); null en el personal de DIMA.
export type CustomerAccountView = {
  customerName: string;
  seesBags: boolean;
  requestsWork: boolean;
  comments: boolean;
};

export type UserAdminDetail = UserRow & {
  cityId: string | null;
  jobTitle: string | null;
  isSelf: boolean;
  customerAccount: CustomerAccountView | null;
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

export type AuditFilters = {
  entity?: string;
  from?: string;
  to?: string;
  cursor?: string;
};

export type AuditEventView = {
  id: string;
  at: string;
  actor: string | null;
  entity: string;
  entityId: string;
  subject: string | null;
  action: string;
  before: unknown;
  after: unknown;
  ip: string | null;
};
