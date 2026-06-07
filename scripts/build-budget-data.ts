/**
 * Fetches FY2026 operating budget from Mesa Open Budget (Socrata)
 * and writes data/budget-fy26.json + data/funds-fy26.json
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPENSES_API = "https://data.mesaaz.gov/resource/29q3-4ewh.json";
const REVENUE_API = "https://data.mesaaz.gov/resource/69ew-t3nx.json";
const FY = "2026";
const OPERATING = "Operating Budget";

type Row = { sum_adopted_budget?: string; total?: string; [key: string]: string };

async function soqlExp(params: Record<string, string>): Promise<Row[]> {
  const q = new URLSearchParams(params);
  const res = await fetch(`${EXPENSES_API}?${q}`);
  if (!res.ok) throw new Error(`Socrata expenses error ${res.status}`);
  return res.json() as Promise<Row[]>;
}

async function soqlRev(params: Record<string, string>): Promise<Row[]> {
  const q = new URLSearchParams(params);
  const res = await fetch(`${REVENUE_API}?${q}`);
  if (!res.ok) throw new Error(`Socrata revenue error ${res.status}`);
  return res.json() as Promise<Row[]>;
}

async function sumExp(where: string): Promise<number> {
  const rows = await soqlExp({ $select: "sum(adopted_budget)", $where: where });
  return Number(rows[0]?.sum_adopted_budget ?? 0);
}

async function sumRev(where: string): Promise<number> {
  const rows = await soqlRev({ $select: "sum(adopted_budget)", $where: where });
  return Number(rows[0]?.sum_adopted_budget ?? 0);
}

async function deptInFund(dept: string, fundCat: string): Promise<number> {
  return sumExp(
    `fiscal_year='${FY}' AND appropriation_name='${OPERATING}' AND department_name='${dept.replace(/'/g, "''")}' AND fund_category='${fundCat}'`,
  );
}

async function fundLike(pattern: string): Promise<number> {
  return sumExp(
    `fiscal_year='${FY}' AND appropriation_name='${OPERATING}' AND fund_name like '%${pattern}%'`,
  );
}

async function revFundLike(pattern: string): Promise<number> {
  return sumRev(
    `fiscal_year='${FY}' AND appropriation_name='${OPERATING}' AND fund_name like '%${pattern}%'`,
  );
}

interface FundLine {
  id: string;
  name: string;
  adoptedAmount: number;
  adjustable: boolean;
  maxDeltaPct?: number;
  ongoing?: boolean;
  group?: string;
  source: string;
  confidence: "adopted" | "forecast" | "estimate";
}

interface FundDef {
  id: string;
  name: string;
  type: "discretionary" | "restricted" | "enterprise" | "trust" | "grant" | "debt";
  description: string;
  fundRuleIds: string[];
  reserveBeginning?: number;
  reserveTargetPct?: [number, number];
  revenues: FundLine[];
  expenditures: FundLine[];
  source: string;
  confidence: "adopted" | "forecast" | "estimate";
}

async function main() {
  const base = `fiscal_year='${FY}' AND appropriation_name='${OPERATING}'`;
  const [totalOp, totalAll, gfExp, restrictedExp, enterpriseExp, otherExp, grantExp] =
    await Promise.all([
      sumExp(base),
      sumExp(`fiscal_year='${FY}'`),
      sumExp(`${base} AND fund_category='General Fund'`),
      sumExp(`${base} AND fund_category='Restricted Funds'`),
      sumExp(`${base} AND fund_category='Enterprise Funds'`),
      sumExp(`${base} AND fund_category='Other Funds'`),
      sumExp(`${base} AND fund_category='Grant Funds'`),
    ]);

  const [gfRev, restrictedRev, enterpriseRev, otherRev, grantRev] = await Promise.all([
    sumRev(`${base} AND fund_category='General Fund'`),
    sumRev(`${base} AND fund_category='Restricted Funds'`),
    sumRev(`${base} AND fund_category='Enterprise Funds'`),
    sumRev(`${base} AND fund_category='Other Funds'`),
    sumRev(`${base} AND fund_category='Grant Funds'`),
  ]);

  const gfDepts = [
    ["police", "Police"],
    ["fire-medical", "Mesa Fire and Medical"],
    ["municipal-court", "Municipal Court"],
    ["library", "Library Services"],
    ["parks-recreation", "Parks, Recreation and Community Facilities"],
    ["arts-culture", "Arts and Culture"],
    ["community-services", "Community Services"],
    ["development-services", "Development Services"],
    ["transit-gf", "Transit Services"],
  ] as const;

  const gfAmounts: Record<string, number> = {};
  for (const [id, dept] of gfDepts) {
    gfAmounts[id] = await deptInFund(dept, "General Fund");
  }

  // Internal & support services — itemized so residents can fine-tune each. Each is
  // load-bearing (zeroing HR halts hiring/benefits; zeroing IT takes systems offline).
  const TRANSIT_GF_TRANSFER = 26_900_000;
  const internalNamed: [id: string, label: string, dept: string, icon: string, desc: string][] = [
    ["it-innovation", "Innovation & Technology", "Department of Innovation & Technology", "cpu", "City networks, cybersecurity, applications, and data systems that run every department."],
    ["human-resources", "Human Resources", "Human Resources", "users", "Recruiting, classification & pay, workers' comp safety, and employee/retiree benefits administration."],
    ["financial-services", "Financial Services", "Financial Services", "calculator", "Accounting, payroll, purchasing, treasury, and utility billing."],
    ["city-manager", "City Manager's Office", "City Manager", "briefcase", "Executive leadership that directs all city departments and implements Council policy."],
    ["city-attorney", "City Attorney", "City Attorney", "gavel", "Legal counsel, prosecution, and contract/risk review for the city."],
    ["engineering", "Engineering", "Engineering", "ruler", "Design, survey, and construction management for streets, utilities, and facilities."],
    ["facilities", "Facilities Management", "Facilities Management", "wrench", "Upkeep of city buildings, HVAC, and public facilities."],
    ["economic-development", "Economic Development", "Economic Development", "trending-up", "Business attraction and retention, and downtown/employment-area redevelopment."],
    ["business-services", "Business Services", "Business Services", "briefcase", "Procurement, fleet coordination, and shared administrative support."],
  ];
  const internalAmounts: Record<string, number> = {};
  let internalNamedSum = 0;
  for (const [id, , dept] of internalNamed) {
    const amt = await deptInFund(dept, "General Fund");
    internalAmounts[id] = amt;
    internalNamedSum += amt;
  }

  // Full administration pool, so the long tail (Clerk, Mayor/Council, Auditor, OMB,
  // contingencies, centralized appropriations) lands in one "Centralized & other" line.
  const allAdminDepts = [
    "City Manager", "City Attorney", "Business Services", "Financial Services",
    "Department of Innovation & Technology", "Human Resources", "Facilities Management",
    "Contingencies", "Centralized Appropriations", "Engineering", "Economic Development",
    "Fleet Services", "Code Compliance", "Environmental and Sustainability",
    "Public Information and Communications", "Communications", "City Clerk",
    "Mayor and Council", "City Auditor", "Office of Management and Budget",
    "Office of ERP Management", "Data and Performance Management",
  ];
  let adminTotal = 0;
  for (const d of allAdminDepts) adminTotal += await deptInFund(d, "General Fund");
  adminTotal += await deptInFund("Centralized Appropriations II", "General Fund");
  // Long tail of admin (Clerk, Mayor/Council, Auditor, OMB, contingencies, centralized).
  const internalOther = Math.max(0, adminTotal - internalNamedSum);

  const [
    hurf, localStreets, psTaxPolice, psTaxFire, qolTax, transitFund, ecf, ambulance,
    utilityWater, utilityWastewater, utilitySolid, utilityGas, utilityElectric,
    falcon, ebt, contingencyOther,
  ] = await Promise.all([
    fundLike("Highway User Revenue"),
    fundLike("Local Streets"),
    fundLike("Public Safety Sales Tax Police"),
    fundLike("Public Safety Sales Tax Fire"),
    fundLike("Quality of Life Sales Tax"),
    fundLike("Transit Fund"),
    fundLike("Environmental Compliance Fee"),
    fundLike("Ambulance Transport"),
    fundLike("Utility Fund Water"),
    fundLike("Utility Fund Wastewater"),
    fundLike("Utility Fund Solid Waste"),
    fundLike("Utility Fund Natural Gas"),
    fundLike("Utility Fund Electric"),
    sumExp(`${base} AND department_name='Falcon Field Airport'`),
    fundLike("Employee Benefit Trust"),
    fundLike("Contingency"),
  ]);

  const transportationRestricted = await sumExp(
    `${base} AND department_name='Transportation' AND fund_category='Restricted Funds'`,
  );
  const streetsPool = hurf + localStreets + transportationRestricted;
  const policeRestricted = await deptInFund("Police", "Restricted Funds");
  const policeOther = await deptInFund("Police", "Other Funds");
  const fireRestricted = await deptInFund("Mesa Fire and Medical", "Restricted Funds");
  const parksRestricted = await deptInFund("Parks, Recreation and Community Facilities", "Restricted Funds");
  gfAmounts["police"] = (gfAmounts["police"] ?? 0) + policeOther * 0.5;

  const localSalesTaxRev = await revFundLike("General Fund");
  const utilityContribRev = 147_000_000;

  type Cat = {
    id: string;
    name: string;
    fundGroup: string;
    fundId: string;
    adoptedAmount: number;
    adjustable: boolean;
    fundRuleIds: string[];
    description: string;
    icon: string;
    group?: string;
    source: string;
    confidence: "adopted" | "forecast" | "estimate";
  };

  const mkExp = (id: string, name: string, amt: number, fundId: string, icon: string, desc: string, adj = true, group?: string): Cat => ({
    id, name, fundGroup: fundId.includes("general") ? "general" : fundId.includes("restricted") || ["streets", "transit", "ps", "qol", "ecf", "ambulance"].some((x) => fundId.includes(x)) ? "restricted" : fundId.includes("enterprise") || fundId.includes("utility") || fundId === "falcon-field" ? "enterprise" : "locked",
    fundId, adoptedAmount: amt, adjustable: adj, fundRuleIds: [], description: desc, icon, group,
    source: "Open Budget Expenses 29q3-4ewh", confidence: "adopted" as const,
  });

  const categories: Cat[] = [
    { ...mkExp("police", "Mesa Police Department", gfAmounts["police"] ?? 0, "general-fund", "shield", "General Fund police operations."), fundRuleIds: ["general-fund"] },
    { ...mkExp("fire-medical", "Mesa Fire & Medical", gfAmounts["fire-medical"] ?? 0, "general-fund", "flame", "General Fund fire and medical."), fundRuleIds: ["general-fund"] },
    { ...mkExp("municipal-court", "Municipal Court", gfAmounts["municipal-court"] ?? 0, "general-fund", "scale", "Court services."), fundRuleIds: ["general-fund"] },
    { ...mkExp("library", "Mesa Public Library", gfAmounts["library"] ?? 0, "general-fund", "book", "Five library locations."), fundRuleIds: ["general-fund"] },
    { ...mkExp("parks-recreation", "Parks & Recreation", gfAmounts["parks-recreation"] ?? 0, "general-fund", "trees", "Parks, pools, recreation."), fundRuleIds: ["general-fund"] },
    { ...mkExp("arts-culture", "Arts & Culture", gfAmounts["arts-culture"] ?? 0, "general-fund", "palette", "Mesa Arts Center and museums."), fundRuleIds: ["general-fund", "quality-of-life"] },
    { ...mkExp("community-services", "Community Services", gfAmounts["community-services"] ?? 0, "general-fund", "heart", "Housing, human services."), fundRuleIds: ["general-fund"] },
    { ...mkExp("development-services", "Development Services", gfAmounts["development-services"] ?? 0, "general-fund", "building", "Permits and planning."), fundRuleIds: ["general-fund"] },
    { ...mkExp("transit-gf-transfer", "Transit Subsidy (to Transit Fund)", TRANSIT_GF_TRANSFER, "general-fund", "bus", "General Fund money that covers transit costs fares + regional funds don't: Mesa-only bus routes, Ride Choice paratransit, and light rail."), fundRuleIds: ["general-fund", "ltaf-transit"] },
    { ...mkExp("streets-hurf-lsst", "Streets (HURF & LSST)", streetsPool, "streets-fund", "road", "Street-related only.", true), fundRuleIds: ["hurf-lsst"] },
    { ...mkExp("transit-fund", "Transit Fund Operations", transitFund, "transit-fund", "bus", "LTAF and transit."), fundRuleIds: ["ltaf-transit"] },
    { ...mkExp("ps-sales-tax", "Public Safety Sales Tax", psTaxPolice + psTaxFire, "ps-tax-fund", "badge", "Voter-approved PS tax.", false), fundRuleIds: ["public-safety-tax"] },
    { ...mkExp("quality-of-life-tax", "Quality of Life Sales Tax", qolTax, "qol-fund", "sparkles", "Voter tax for sworn FTE."), fundRuleIds: ["quality-of-life"] },
    { ...mkExp("police-restricted", "Police Restricted Funds", policeRestricted, "ps-tax-fund", "shield", "PS tax allocations.", false), fundRuleIds: ["public-safety-tax"] },
    { ...mkExp("fire-restricted", "Fire Restricted Funds", fireRestricted, "ps-tax-fund", "flame", "PS tax allocations.", false), fundRuleIds: ["public-safety-tax"] },
    { ...mkExp("parks-restricted", "Parks Restricted Funds", parksRestricted, "parks-restricted-fund", "trees", "Commercial facilities, cemetery, ECF, and program funds for parks — not street taxes.", false), fundRuleIds: ["internal"] },
    { ...mkExp("environmental-compliance", "Environmental Compliance Fee", ecf, "ecf-fund", "leaf", "EPA mandates on utility bills.", false), fundRuleIds: ["environmental-fee"] },
    { ...mkExp("ambulance-transport", "Ambulance Transport", ambulance, "ambulance-fund", "ambulance", "EMS transport."), fundRuleIds: ["ambulance-fund"] },
    { ...mkExp("utilities-water", "Water & Wastewater", utilityWater + utilityWastewater, "utility-water", "droplets", "Water/wastewater enterprise."), fundRuleIds: ["utility-enterprise"] },
    { ...mkExp("utilities-solid-waste", "Solid Waste", utilitySolid, "utility-solid", "trash", "Trash and recycling."), fundRuleIds: ["utility-enterprise"] },
    { ...mkExp("utilities-energy", "Energy (Gas & Electric)", utilityGas + utilityElectric, "utility-energy", "zap", "Gas and electric; transfer source."), fundRuleIds: ["utility-enterprise", "utility-transfer"] },
    { ...mkExp("falcon-field", "Falcon Field Airport", falcon, "falcon-field", "plane", "Self-sustaining airport.", false), fundRuleIds: ["falcon-field"] },
    { ...mkExp("employee-benefits-trust", "Employee Benefits Trust", ebt, "ebt-fund", "heart-pulse", "Health benefits.", false), fundRuleIds: ["trust-ebt"] },
    { ...mkExp("contingency", "Contingency", contingencyOther, "other-funds", "life-buoy", "Fiscal reserves.", false), fundRuleIds: ["internal"] },
    { ...mkExp("grants-restricted", "Grant Funds", grantExp, "grants-fund", "file-badge", "Federal/state grants.", false), fundRuleIds: ["grants"] },
  ];

  // Itemized internal & support services (group: "internal-services")
  for (const [id, label, , icon, desc] of internalNamed) {
    categories.push({
      ...mkExp(id, label, internalAmounts[id] ?? 0, "general-fund", icon, desc, true, "internal-services"),
      fundRuleIds: ["general-fund"],
    });
  }
  categories.push({
    ...mkExp("internal-other", "Centralized & Other Support", internalOther, "general-fund", "layers", "City Clerk, Mayor & Council, City Auditor, Budget Office, and centralized/contingency costs.", true, "internal-services"),
    fundRuleIds: ["general-fund"],
  });

  // Capture the remaining General Fund departments/transfers not individually listed
  // so the General Fund reflects its true ~$667.6M total (matches Open Budget).
  const gfEnumerated = categories
    .filter((c) => c.fundId === "general-fund")
    .reduce((a, c) => a + c.adoptedAmount, 0);
  const gfCatchAll = Math.max(0, gfExp - gfEnumerated);
  if (gfCatchAll > 100_000) {
    categories.push({
      ...mkExp("gf-other-departments", "Other Departments & Transfers", gfCatchAll, "general-fund", "landmark", "Smaller General Fund departments, transfers, and centralized costs.", false),
      fundRuleIds: ["general-fund"],
    });
  }

  const catSum = categories.reduce((a, c) => a + c.adoptedAmount, 0);
  const remainder = totalOp - catSum;
  categories.push({
    ...mkExp("other-restricted-enterprise", "Other Restricted & Internal", Math.max(0, remainder), "other-funds", "layers", "Remaining operating funds.", false),
    fundRuleIds: ["internal"],
  });

  const stateSharedEst = await sumRev(
    `${base} AND fund_category='General Fund' AND revenue_object_category_name like '%Intergovernmental%'`,
  );

  const revenue = [
    { id: "local-sales-tax", name: "Local Sales & Use Tax", adoptedAmount: Math.round(localSalesTaxRev * 0.74), adjustable: true, maxDeltaPct: 5, fundRuleIds: ["revenue-local"], description: "2% Mesa TPT.", source: "Open Budget Revenues 69ew-t3nx", confidence: "adopted" as const },
    { id: "state-shared", name: "State Shared Revenue", adoptedAmount: stateSharedEst || Math.round(gfRev * 0.26), adjustable: true, maxDeltaPct: 3, fundRuleIds: ["revenue-state"], description: "URS, state sales tax, VLT.", source: "Open Budget Revenues", confidence: "adopted" as const },
    { id: "utility-contribution", name: "Utility Fund Contribution", adoptedAmount: utilityContribRev, adjustable: true, maxDeltaPct: 8, fundRuleIds: ["utility-transfer"], description: "Max 30% of utility revenues.", source: "Council Budget Summary", confidence: "adopted" as const },
    { id: "other-gf-revenue", name: "Licenses, Fines & Other GF", adoptedAmount: Math.max(0, gfRev - Math.round(localSalesTaxRev * 0.74) - (stateSharedEst || Math.round(gfRev * 0.26)) - utilityContribRev), adjustable: false, fundRuleIds: ["revenue-other"], description: "Misc GF receipts.", source: "Open Budget Revenues", confidence: "adopted" as const },
    { id: "restricted-revenue", name: "Restricted & Enterprise Revenue", adoptedAmount: restrictedRev + enterpriseRev, adjustable: false, fundRuleIds: ["grants"], description: "HURF, LSST, utility rates.", source: "Open Budget Revenues", confidence: "adopted" as const },
    { id: "other-funds-revenue", name: "Trust, Debt & Other Funds", adoptedAmount: otherRev, adjustable: false, fundRuleIds: ["internal"], description: "EBT, debt service.", source: "Open Budget Revenues", confidence: "adopted" as const },
    { id: "grants-revenue", name: "Grant Revenue", adoptedAmount: grantRev, adjustable: false, fundRuleIds: ["grants"], description: "Grant receipts.", source: "Open Budget Revenues", confidence: "adopted" as const },
  ];

  let revSum = revenue.reduce((a, r) => a + r.adoptedAmount, 0);
  if (Math.abs(revSum - totalOp) > 1000) {
    revenue.push({
      id: "revenue-adjustment", name: "Revenue Reconciliation", adoptedAmount: totalOp - revSum,
      adjustable: false, fundRuleIds: ["revenue-other"], description: "Balancing adjustment.", source: "ETL reconciliation", confidence: "adopted" as const,
    });
  }

  // General Fund revenue composition. The Open Budget "Revenues" dataset omits the
  // Utility Fund transfer (it is an inter-fund transfer, not a tax), so we use the
  // Council Budget Summary splits that reconcile to General Fund expenditures.
  const gfExpSum = categories
    .filter((c) => c.fundId === "general-fund")
    .reduce((a, c) => a + c.adoptedAmount, 0);
  const GF_LOCAL_SALES = 347_160_484;
  const GF_STATE_SHARED = 120_170_937;
  const GF_UTILITY_CONTRIB = Math.round(492_100_000 * 0.30); // 30% cap of utility operating revenue
  void gfExpSum;
  const GF_OTHER = Math.max(0, gfExp - GF_LOCAL_SALES - GF_STATE_SHARED - GF_UTILITY_CONTRIB);

  const funds: FundDef[] = [
    {
      id: "general-fund", name: "General Fund", type: "discretionary",
      description: "Discretionary dollars for police, fire, libraries, parks, and citywide services.",
      fundRuleIds: ["general-fund"], reserveTargetPct: [8, 10],
      reserveBeginning: 85_000_000, source: "Council Budget Summary", confidence: "estimate",
      revenues: [
        { id: "local-sales-tax", name: "Local Sales & Use Tax", adoptedAmount: GF_LOCAL_SALES, adjustable: false, source: "Council Budget Summary (2% Mesa TPT)", confidence: "adopted" },
        { id: "state-shared", name: "State Shared Revenue", adoptedAmount: GF_STATE_SHARED, adjustable: false, source: "Council Budget Summary (AZ formula)", confidence: "adopted" },
        { id: "utility-contribution", name: "Utility Fund Contribution", adoptedAmount: GF_UTILITY_CONTRIB, adjustable: false, source: "Council resolution (\u226430% of utility revenue)", confidence: "adopted" },
        { id: "other-gf-revenue", name: "Licenses, Fines & Charges", adoptedAmount: GF_OTHER, adjustable: false, source: "Council Budget Summary", confidence: "adopted" },
      ],
      expenditures: categories.filter((c) => c.fundId === "general-fund").map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: c.adjustable, ongoing: true,
        group: c.group, source: c.source, confidence: c.confidence,
      })),
    },
    {
      id: "streets-fund", name: "Streets (HURF & LSST)", type: "restricted",
      description: "Legally restricted to street-related expenditures only.",
      fundRuleIds: ["hurf-lsst"], reserveBeginning: 86_400_000, source: "Council Budget Summary", confidence: "adopted",
      revenues: [
        { id: "hurf-revenue", name: "HURF", adoptedAmount: hurf, adjustable: true, maxDeltaPct: 5, source: "Open Budget", confidence: "adopted" },
        { id: "lsst-revenue", name: "Local Street Sales Tax", adoptedAmount: localStreets, adjustable: true, maxDeltaPct: 3, source: "Open Budget", confidence: "adopted" },
      ],
      expenditures: categories.filter((c) => c.fundId === "streets-fund").map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: c.adjustable, ongoing: true,
        source: c.source, confidence: c.confidence,
      })),
    },
    {
      id: "transit-fund", name: "Transit Fund", type: "restricted",
      description: "LTAF and transit revenues restricted to transit services.",
      fundRuleIds: ["ltaf-transit"], source: "Council Budget Summary", confidence: "adopted",
      revenues: [
        { id: "transit-restricted-rev", name: "Fares + Regional Funds (Prop 400/479)", adoptedAmount: Math.max(0, transitFund - TRANSIT_GF_TRANSFER), adjustable: false, source: "Open Budget / RPTA agreements (estimate)", confidence: "estimate" },
        { id: "transit-gf-transfer-in", name: "General Fund Transit Subsidy", adoptedAmount: TRANSIT_GF_TRANSFER, adjustable: false, source: "Council Budget Summary ($26.9M, linked to General Fund)", confidence: "adopted" },
      ],
      expenditures: categories.filter((c) => c.fundId === "transit-fund").map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: c.adjustable, ongoing: true,
        source: c.source, confidence: c.confidence,
      })),
    },
    {
      id: "utility-enterprise", name: "Utility Enterprise", type: "enterprise",
      description: "Water, wastewater, solid waste, gas, and electric — funded by rates.",
      fundRuleIds: ["utility-enterprise", "utility-transfer"],
      reserveBeginning: 45_000_000, source: "Council Budget Summary", confidence: "estimate",
      revenues: [
        { id: "utility-rates", name: "Utility Rate Revenue", adoptedAmount: 492_100_000, adjustable: true, maxDeltaPct: 8, source: "Council Budget Summary", confidence: "adopted" },
      ],
      expenditures: categories.filter((c) => ["utility-water", "utility-solid", "utility-energy"].includes(c.fundId)).map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: c.adjustable, ongoing: true,
        source: c.source, confidence: c.confidence,
      })),
    },
    {
      id: "ps-tax-fund", name: "Public Safety Sales Tax", type: "restricted",
      description: "Voter-approved tax for public safety programs and projects.",
      fundRuleIds: ["public-safety-tax"], source: "Voter ballot", confidence: "adopted",
      revenues: [{ id: "ps-tax-rev", name: "PS Sales Tax Collections", adoptedAmount: psTaxPolice + psTaxFire + policeRestricted + fireRestricted, adjustable: false, source: "Open Budget", confidence: "adopted" }],
      expenditures: categories.filter((c) => c.fundId === "ps-tax-fund").map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: c.adjustable, ongoing: true,
        source: c.source, confidence: c.confidence,
      })),
    },
    {
      id: "qol-fund", name: "Quality of Life Sales Tax", type: "restricted",
      description: "Voter tax supporting up to 120 Police and 65 Fire sworn FTE.",
      fundRuleIds: ["quality-of-life"], source: "Voter ballot", confidence: "adopted",
      revenues: [{ id: "qol-rev", name: "QoL Tax Collections", adoptedAmount: qolTax, adjustable: true, maxDeltaPct: 5, source: "Open Budget", confidence: "adopted" }],
      expenditures: categories.filter((c) => c.fundId === "qol-fund").map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: c.adjustable, ongoing: true,
        source: c.source, confidence: c.confidence,
      })),
    },
    {
      id: "parks-restricted-fund", name: "Parks Restricted Funds", type: "restricted",
      description: "Dedicated facility and program funds for parks — commercial facilities, cemetery, ECF, and restricted programs (not HURF/LSST).",
      fundRuleIds: ["internal"], source: "Open Budget Expenses 29q3-4ewh", confidence: "adopted",
      revenues: [],
      expenditures: categories.filter((c) => c.fundId === "parks-restricted-fund").map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: c.adjustable, ongoing: true,
        source: c.source, confidence: c.confidence,
      })),
    },
    {
      id: "ecf-fund", name: "Environmental Compliance Fee", type: "restricted",
      description: "Monthly utility fee for unfunded environmental mandates (~$18.3M).",
      fundRuleIds: ["environmental-fee"], source: "Council Budget Summary", confidence: "adopted",
      revenues: [{ id: "ecf-rev", name: "ECF Collections", adoptedAmount: 18_300_000, adjustable: false, source: "Council Budget Summary", confidence: "adopted" }],
      expenditures: categories.filter((c) => c.fundId === "ecf-fund").map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: c.adjustable, ongoing: true,
        source: c.source, confidence: c.confidence,
      })),
    },
    {
      id: "ambulance-fund", name: "Ambulance Transport", type: "enterprise",
      description: "Self-sustaining EMS transport program.",
      fundRuleIds: ["ambulance-fund"], source: "Council Budget Summary", confidence: "adopted",
      revenues: [{ id: "ambulance-rev", name: "Transport Fees", adoptedAmount: ambulance * 0.95, adjustable: true, maxDeltaPct: 10, source: "Open Budget", confidence: "estimate" }],
      expenditures: categories.filter((c) => c.fundId === "ambulance-fund").map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: c.adjustable, ongoing: true,
        source: c.source, confidence: c.confidence,
      })),
    },
    {
      id: "ebt-fund", name: "Employee Benefits Trust", type: "trust",
      description: "Employee and retiree health benefits.",
      fundRuleIds: ["trust-ebt"], source: "Council Budget Summary", confidence: "adopted",
      revenues: [
        { id: "ebt-premiums", name: "Employee/Retiree Premiums", adoptedAmount: ebt * 0.27, adjustable: false, source: "Council Budget Summary", confidence: "estimate" },
        { id: "ebt-city-contrib", name: "City Contribution", adoptedAmount: 100_500_000, adjustable: true, maxDeltaPct: 5, source: "Council Budget Summary", confidence: "adopted" },
      ],
      expenditures: categories.filter((c) => c.fundId === "ebt-fund").map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: false, ongoing: true,
        source: c.source, confidence: c.confidence,
      })),
    },
    {
      id: "grants-fund", name: "Grant Funds", type: "grant",
      description: "Federal and state grants with designated uses.",
      fundRuleIds: ["grants"], source: "Open Budget", confidence: "adopted",
      revenues: [{ id: "grants-rev", name: "Grant Receipts", adoptedAmount: grantRev, adjustable: false, source: "Open Budget", confidence: "adopted" }],
      expenditures: categories.filter((c) => c.fundId === "grants-fund").map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: false, ongoing: true,
        source: c.source, confidence: c.confidence,
      })),
    },
    {
      id: "other-funds", name: "Other & Internal Funds", type: "trust",
      description: "Contingency, debt service, internal transfers.",
      fundRuleIds: ["internal"], source: "Open Budget", confidence: "adopted",
      revenues: [{ id: "other-rev", name: "Other Fund Revenue", adoptedAmount: otherRev, adjustable: false, source: "Open Budget", confidence: "adopted" }],
      expenditures: categories.filter((c) => c.fundId === "other-funds").map((c) => ({
        id: c.id, name: c.name, adoptedAmount: c.adoptedAmount, adjustable: c.adjustable, ongoing: true,
        source: c.source, confidence: c.confidence,
      })),
    },
  ];

  // Mesa adopts a balanced budget. Make each fund balance at adoption using fund
  // balance / reserves as the explicit balancing item, so any deficit the user sees
  // is the direct result of their own spending or rate choices.
  for (const fund of funds) {
    const expSum = fund.expenditures.reduce((a, e) => a + e.adoptedAmount, 0);
    const revSum = fund.revenues.reduce((a, r) => a + r.adoptedAmount, 0);
    const diff = expSum - revSum;
    if (diff > 100_000) {
      fund.revenues.push({
        id: `${fund.id}-reserves`, name: "Use of Fund Balance / Reserves",
        adoptedAmount: Math.round(diff), adjustable: false,
        source: "Balanced-budget reserve use (educational estimate)", confidence: "estimate",
      });
    } else if (diff < -100_000) {
      fund.expenditures.push({
        id: `${fund.id}-to-reserves`,
        name: fund.id === "utility-enterprise"
          ? "Transfer to City Services, Capital & Reserves"
          : "Contribution to Reserves & Capital",
        adoptedAmount: Math.round(-diff), adjustable: false, ongoing: true,
        source: "Balanced-budget allocation (educational estimate)", confidence: "estimate",
      });
    }
  }

  const meta = {
    fiscalYear: "2025/26",
    fiscalYearCode: FY,
    totalOperatingBudget: totalOp,
    totalCityBudget: totalAll,
    cipExcluded: totalAll - totalOp,
    fundCategoryTotals: { generalFund: gfExp, restricted: restrictedExp, enterprise: enterpriseExp, other: otherExp, grants: grantExp },
    fundCategoryRevenues: { generalFund: gfRev, restricted: restrictedRev, enterprise: enterpriseRev, other: otherRev, grants: grantRev },
    utilityContributionCapPct: 30,
    utilityContributionAdopted: GF_UTILITY_CONTRIB,
    utilityOperatingRevenue: 492_100_000,
    transitGfTransfer: 26_900_000,
    localSalesTaxRatePct: 2.0,
    generatedAt: new Date().toISOString(),
    source: "https://data.mesaaz.gov/Office-of-Management-and-Budget/Open-Budget-Expenses/29q3-4ewh",
  };

  const outDir = join(__dirname, "..", "data");
  mkdirSync(outDir, { recursive: true });

  const budgetOutput = {
    meta,
    revenue,
    categories,
    validation: {
      categorySum: categories.reduce((a, c) => a + c.adoptedAmount, 0),
      revenueSum: revenue.reduce((a, r) => a + r.adoptedAmount, 0),
    },
  };

  const fundsOutput = { meta, funds };

  writeFileSync(join(outDir, "budget-fy26.json"), JSON.stringify(budgetOutput, null, 2));
  writeFileSync(join(outDir, "funds-fy26.json"), JSON.stringify(fundsOutput, null, 2));
  console.log(`Operating $${(totalOp / 1e6).toFixed(1)}M | ${categories.length} cats | ${funds.length} funds`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
