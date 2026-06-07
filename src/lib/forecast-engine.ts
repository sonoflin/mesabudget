import forecastAssumptions from "../../data/forecast-assumptions.json";
import type { Fund, MultiFundSnapshot } from "./funds-model";
import { funds, getRevenueControl } from "./funds-model";
import { computeFundRevenueLines } from "./fund-rules-engine";

/**
 * Mesa-style multi-year forecast.
 *
 * Method (mirrors the City of Mesa's published approach):
 *  - The adopted year (FY25/26) is balanced for every fund.
 *  - Each recurring revenue and expenditure line is grown by a source-specific
 *    rate (sales tax, state-shared, utility, personnel/pension inflation, ...).
 *  - One-time "Use of Fund Balance / Reserves" and "Contribution to Reserves &
 *    Capital" plug lines are held flat (they represent one-time capital, not
 *    recurring operations), so the *structural* gap only emerges from the
 *    divergence between recurring revenue growth and recurring expenditure growth.
 *  - Reserves move year over year by (revenue − expenditure); Mesa policy targets
 *    an unrestricted reserve of 8–10% of the following year's expenditures.
 *
 * Every figure is driven by the live snapshot, so the user's lever moves (utility
 * rate, utility contribution %, sales-tax ballot measure) and per-department
 * spending choices flow straight through to the gap and the reserve trajectory.
 */

const A = forecastAssumptions;
const G = A.growth;
const YEARS = A.forecastYears as string[];

const REVENUE_BY_LINE = G.revenueByLine as Record<string, number | number[]>;
const EXP_BY_TYPE = G.expenditureByFundType as Record<string, number>;
const CONSUMPTION = G.utilityConsumptionPct;
const DISC_EXP_RATE = EXP_BY_TYPE.discretionary ?? 3.5;

export interface ForecastFundYear {
  fundId: string;
  fundName: string;
  revenue: number;
  expenditure: number;
  gap: number; // expenditure − revenue (positive = structural deficit that year)
  reserveBegin: number;
  reserveEnd: number;
  reserveTargetMin: number;
  reserveTargetMax: number;
  belowFloor: boolean;
}

export interface ForecastYear {
  fiscalYear: string;
  fiscalYearCode: number;
  totalRevenue: number;
  totalExpenditure: number;
  structuralGap: number; // citywide expenditure − revenue
  generalFundRevenue: number;
  generalFundExpenditure: number;
  generalFundGap: number;
  generalFundReserve: number;
  generalFundReserveTargetMin: number;
  generalFundReservePct: number;
  funds: ForecastFundYear[];
}

function isReserveDraw(revId: string): boolean {
  return getRevenueControl(revId) === "reserves";
}

function isReserveContribution(expId: string): boolean {
  return expId.endsWith("-to-reserves") || expId.endsWith("-reserves");
}

/** Growth multiplier for a recurring revenue line between the base year and year i. */
function revenueFactor(revId: string, i: number): number {
  if (i === 0 || isReserveDraw(revId)) return 1;
  const spec = REVENUE_BY_LINE[revId];
  if (Array.isArray(spec)) {
    let f = 1;
    for (let k = 1; k <= i; k++) f *= 1 + (spec[k] ?? spec[spec.length - 1]) / 100;
    return f;
  }
  const rate = typeof spec === "number" ? spec : G.defaultRevenuePct;
  return Math.pow(1 + rate / 100, i);
}

/** Growth multiplier for a recurring expenditure line between the base year and year i. */
function expenditureFactor(fund: Fund, expId: string, i: number): number {
  if (i === 0 || isReserveContribution(expId)) return 1;
  const rate = EXP_BY_TYPE[fund.type] ?? 3.0;
  return Math.pow(1 + rate / 100, i);
}

function reserveBeginningFor(fund: Fund, baseExpenditure: number): number {
  if (typeof fund.reserveBeginning === "number") return fund.reserveBeginning;
  return Math.round((G.reserveFallbackPctOfExpenditure / 100) * baseExpenditure);
}

export function projectForecast(baseSnapshot: MultiFundSnapshot, yearsAhead = 5): ForecastYear[] {
  const levers = baseSnapshot.levers;

  // Base-year (lever-applied) revenue and expenditure lines for every fund.
  const fundBases = funds.map((fund) => {
    const snap = baseSnapshot.funds[fund.id];
    const revLines = snap
      ? computeFundRevenueLines(fund, snap, levers, baseSnapshot).map((l) => ({ id: l.id, base: l.amount }))
      : [];
    const expLines = fund.expenditures.map((e) => ({
      id: e.id,
      base: snap?.expenditureAmounts[e.id] ?? e.adoptedAmount,
    }));
    const baseExp = expLines.reduce((s, l) => s + l.base, 0);
    return { fund, revLines, expLines, reserve: reserveBeginningFor(fund, baseExp) };
  });

  const results: ForecastYear[] = [];

  // Pre-compute each fund's revenue/expenditure for every year so we can look
  // ahead one year for the reserve target.
  const yearByFund = fundBases.map(({ fund, revLines, expLines }) => {
    const rev: number[] = [];
    const exp: number[] = [];
    for (let i = 0; i < yearsAhead; i++) {
      rev.push(
        Math.round(
          revLines.reduce((sum, l) => {
            if (l.id === "utility-rates") return sum + l.base * Math.pow(1 + CONSUMPTION / 100, i);
            if (l.id === "utility-contribution") return sum + l.base * Math.pow(1 + CONSUMPTION / 100, i);
            if (l.id === "transit-gf-transfer-in") return sum + l.base * Math.pow(1 + DISC_EXP_RATE / 100, i);
            return sum + l.base * revenueFactor(l.id, i);
          }, 0),
        ),
      );
      exp.push(
        Math.round(expLines.reduce((sum, l) => sum + l.base * expenditureFactor(fund, l.id, i), 0)),
      );
    }
    return { fund, rev, exp };
  });

  const reserves = fundBases.map((b) => b.reserve);

  for (let i = 0; i < yearsAhead; i++) {
    const fyLabel = YEARS[i] ?? `20${26 + i}/${27 + i}`;
    const fyCode = 2026 + i;

    let totalRev = 0;
    let totalExp = 0;
    const fundYears: ForecastFundYear[] = yearByFund.map(({ fund, rev, exp }, idx) => {
      const revenue = rev[i];
      const expenditure = exp[i];
      const reserveBegin = reserves[idx];
      const reserveEnd = reserveBegin + (revenue - expenditure);
      reserves[idx] = reserveEnd;

      const nextExp = exp[i + 1] ?? expenditure;
      const reserveTargetMin = Math.round((A.growth.reserveTargetPctMin / 100) * nextExp);
      const reserveTargetMax = Math.round((A.growth.reserveTargetPctMax / 100) * nextExp);

      totalRev += revenue;
      totalExp += expenditure;

      return {
        fundId: fund.id,
        fundName: fund.name,
        revenue,
        expenditure,
        gap: expenditure - revenue,
        reserveBegin,
        reserveEnd,
        reserveTargetMin,
        reserveTargetMax,
        belowFloor: reserveEnd < reserveTargetMin,
      };
    });

    const gf = fundYears.find((f) => f.fundId === "general-fund");
    results.push({
      fiscalYear: fyLabel,
      fiscalYearCode: fyCode,
      totalRevenue: totalRev,
      totalExpenditure: totalExp,
      structuralGap: totalExp - totalRev,
      generalFundRevenue: gf?.revenue ?? 0,
      generalFundExpenditure: gf?.expenditure ?? 0,
      generalFundGap: gf?.gap ?? 0,
      generalFundReserve: gf?.reserveEnd ?? 0,
      generalFundReserveTargetMin: gf?.reserveTargetMin ?? 0,
      generalFundReservePct: gf && gf.expenditure > 0 ? (gf.reserveEnd / gf.expenditure) * 100 : 0,
    });
  }

  return results;
}

/** A short, reactive read-out of what the user's plan does to the 5-year outlook. */
export function getForecastSummary(forecast: ForecastYear[]): {
  headline: string;
  tone: "good" | "warn" | "bad";
} {
  if (forecast.length === 0) return { headline: "Adjust the budget to see its 5-year effect.", tone: "warn" };
  const last = forecast[forecast.length - 1];
  const gapM = Math.round(last.structuralGap / 1e6);
  const reservePct = last.generalFundReservePct;
  const everBelowFloor = forecast.some((y) => y.generalFundReserve < y.generalFundReserveTargetMin);

  if (gapM <= 0 && !everBelowFloor) {
    const surplus = gapM < 0 ? ` (a $${Math.abs(gapM)}M recurring surplus)` : "";
    return {
      headline: `Structurally sustainable: by ${last.fiscalYear} recurring revenue keeps pace with spending${surplus} and General Fund reserves stay above Mesa's 8% floor (about ${reservePct.toFixed(0)}%).`,
      tone: "good",
    };
  }
  if (everBelowFloor) {
    const breach = forecast.find((y) => y.generalFundReserve < y.generalFundReserveTargetMin);
    return {
      headline: `On this plan the structural gap reaches about $${Math.abs(gapM)}M by ${last.fiscalYear}, drawing General Fund reserves below the 8% floor by ${breach?.fiscalYear}. Mesa closes gaps like this with ~2% annual efficiencies or new revenue.`,
      tone: "bad",
    };
  }
  return {
    headline: `A structural gap of about $${Math.abs(gapM)}M opens by ${last.fiscalYear} as recurring costs grow faster than revenue — but General Fund reserves stay above the 8% floor (about ${reservePct.toFixed(0)}%).`,
    tone: "warn",
  };
}

export function getStructuralGapNarrative(): string {
  return A.structuralGap.description;
}

export function getStructuralDrivers(): string[] {
  return A.structuralGap.drivers;
}

export { forecastAssumptions };
