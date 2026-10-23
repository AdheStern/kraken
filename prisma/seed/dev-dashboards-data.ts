// prisma/seed/dev-dashboards-data.ts
// Datos de las ventas de DEMOSTRACIÓN de los tableros (solo db:seed:dev): un CV aprobado por especificación.

export type DemoLine = {
  area: string;
  tech: string;
  cost: string;
  sale: string;
  coverageDays?: number;
};
export type DemoSpec = {
  monthsAgo: number;
  city: string;
  customer: number;
  sellers: ("ana" | "bruno")[];
  lines: DemoLine[];
};

// POR QUÉ: un mes vacío y montos dispares para que la serie, el desglose y las comparaciones tengan forma.
export const DEMO_SALES: DemoSpec[] = [
  {
    monthsAgo: 11,
    city: "LP",
    customer: 0,
    sellers: ["ana"],
    lines: [{ area: "DIMANET", tech: "CISCO", cost: "18400", sale: "25760" }],
  },
  {
    monthsAgo: 10,
    city: "SC",
    customer: 2,
    sellers: ["bruno"],
    lines: [
      { area: "DIMASOFT", tech: "MICROSOFT", cost: "9100", sale: "11830" },
    ],
  },
  {
    monthsAgo: 9,
    city: "CB",
    customer: 3,
    sellers: ["ana", "bruno"],
    lines: [
      { area: "DIMATEL", tech: "HUAWEI", cost: "12600", sale: "17640" },
      { area: "DIMATEL", tech: "HUAWEI", cost: "0", sale: "2400" },
    ],
  },
  {
    monthsAgo: 7,
    city: "LP",
    customer: 1,
    sellers: ["ana"],
    lines: [
      { area: "DIMANET", tech: "FORTINET", cost: "22300", sale: "30105" },
    ],
  },
  {
    monthsAgo: 6,
    city: "LP",
    customer: 0,
    sellers: ["bruno"],
    lines: [{ area: "DIMADOC", tech: "VEEAM", cost: "4200", sale: "6090" }],
  },
  {
    monthsAgo: 5,
    city: "SC",
    customer: 2,
    sellers: ["ana"],
    lines: [
      { area: "DIMANET", tech: "CISCO", cost: "31000", sale: "40300" },
      { area: "DIMANET", tech: "CISCO", cost: "0", sale: "3500" },
    ],
  },
  {
    monthsAgo: 4,
    city: "CB",
    customer: 3,
    sellers: ["bruno"],
    lines: [
      {
        area: "DIMASOFT",
        tech: "MICROSOFT",
        cost: "7800",
        sale: "9750",
        coverageDays: 20,
      },
    ],
  },
  {
    monthsAgo: 3,
    city: "LP",
    customer: 1,
    sellers: ["ana", "bruno"],
    lines: [{ area: "DIMATEL", tech: "HUAWEI", cost: "15400", sale: "21560" }],
  },
  {
    monthsAgo: 2,
    city: "LP",
    customer: 0,
    sellers: ["ana"],
    lines: [
      {
        area: "DIMANET",
        tech: "FORTINET",
        cost: "11200",
        sale: "15680",
        coverageDays: 45,
      },
    ],
  },
  {
    monthsAgo: 1,
    city: "SC",
    customer: 2,
    sellers: ["bruno"],
    lines: [
      {
        area: "DIMASOFT",
        tech: "MICROSOFT",
        cost: "5600",
        sale: "7280",
        coverageDays: 75,
      },
    ],
  },
  {
    monthsAgo: 0,
    city: "LP",
    customer: 1,
    sellers: ["ana"],
    lines: [
      { area: "DIMANET", tech: "CISCO", cost: "26500", sale: "35775" },
      { area: "DIMANET", tech: "CISCO", cost: "0", sale: "4200" },
    ],
  },
];
