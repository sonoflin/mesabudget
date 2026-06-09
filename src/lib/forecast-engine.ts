import forecastAssumptions from "../../data/forecast-assumptions.json";
import type { Fund, MultiFundSnapshot } from "./funds-model";
import { funds, getRevenueControl, getInitialSnapshot } from "./funds-model";
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
  fiscalYear: string;
  fiscalYearCode: number;
  revenue: number;
  expenditure: number;
  gap: number; // expenditure − revenue (positive = structural deficit that year)
  reserveBegin: number;
  reserveEnd: number;
  /** Next year's expenditure — the policy basis for the 8–10% reserve target. */
  nextExpenditure: number;
  reserveTargetMin: number;
  reserveTargetMax: number;
  /** Ending reserve as a % of next year's expenditure (Mesa's policy basis). */
  reservePct: number;
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
        fiscalYear: fyLabel,
        fiscalYearCode: fyCode,
        revenue,
        expenditure,
        gap: expenditure - revenue,
        reserveBegin,
        reserveEnd,
        nextExpenditure: nextExp,
        reserveTargetMin,
        reserveTargetMax,
        reservePct: nextExp > 0 ? (reserveEnd / nextExp) * 100 : 0,
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
      funds: fundYears,
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

// ---------------------------------------------------------------------------
// Fund-balance policy (Mesa Financial Policy 2.1–2.3)
// ---------------------------------------------------------------------------
//  2.1  General Governmental & Enterprise funds adopt unrestricted reserves of
//       8–10% of the FOLLOWING year's expenditures, maintained THROUGHOUT the
//       forecast period.
//  2.2  Council may deliberately adopt below 8%.
//  2.3  If reserves fall below 8%, the City restores them within 1–3 years.

const FLOOR_PCT = A.growth.reserveTargetPctMin; // 8
const TARGET_TOP_PCT = A.growth.reserveTargetPctMax; // 10

/** The two funds the City of Mesa publishes standalone 5-year forecasts for. */
export const FORECAST_FUND_IDS = ["general-fund", "utility-enterprise"] as const;

const money = (n: number) => {
  const m = n / 1e6;
  return Math.abs(m) >= 10 ? `$${Math.round(m)}M` : `$${m.toFixed(1)}M`;
};

/** "2027/28" → "FY27/28" for compact, consistent labels. */
const fy = (fiscalYear: string) => fiscalYear.replace("20", "FY");

/** Pull one fund's year-by-year series out of a citywide projection. */
export function getFundSeries(forecast: ForecastYear[], fundId: string): ForecastFundYear[] {
  return forecast
    .map((y) => (y.funds ?? []).find((f) => f.fundId === fundId))
    .filter((f): f is ForecastFundYear => Boolean(f));
}

export interface FundPolicyStatus {
  fundId: string;
  fundName: string;
  firstFiscalYear: string;
  lastFiscalYear: string;
  /** First forecast year's ending reserve and its % of next-year expenditures. */
  startReserve: number;
  startPct: number;
  /** Final forecast year's ending reserve and %. */
  endReserve: number;
  endPct: number;
  /** Lowest reserve % across the whole horizon. */
  minPct: number;
  /** Reserve ≥ 8% floor in every year (policy 2.1 "maintained throughout"). */
  maintained: boolean;
  /** First year reserves dip below the 8% floor, if any. */
  firstBreach?: { fiscalYear: string; reserve: number; targetMin: number; shortfall: number };
  /** Policy 2.3: even top-up over 3 years to clear the worst shortfall. */
  restorePerYear?: number;
  tone: "good" | "warn" | "bad";
  headline: string;
}

/** Evaluate a fund's 5-year series against Mesa's 8–10% reserve policy. */
export function analyzeFundPolicy(series: ForecastFundYear[]): FundPolicyStatus | null {
  if (series.length === 0) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const minPct = Math.min(...series.map((s) => s.reservePct));
  const maintained = series.every((s) => !s.belowFloor);

  const breach = series.find((s) => s.belowFloor);
  const firstBreach = breach
    ? {
        fiscalYear: breach.fiscalYear,
        reserve: breach.reserveEnd,
        targetMin: breach.reserveTargetMin,
        shortfall: Math.max(0, breach.reserveTargetMin - breach.reserveEnd),
      }
    : undefined;

  const worstShortfall = Math.max(0, ...series.map((s) => s.reserveTargetMin - s.reserveEnd));
  const restorePerYear = worstShortfall > 0 ? Math.round(worstShortfall / 3) : undefined;

  const name = first.fundName;
  const eroding = last.reservePct < first.reservePct - 0.5;
  let tone: "good" | "warn" | "bad";
  let headline: string;
  if (!maintained) {
    tone = "bad";
    headline = `${name} reserves fall below Mesa's 8% floor by ${fy(firstBreach?.fiscalYear ?? last.fiscalYear)}. Policy requires a plan to restore within 1–3 years — roughly ${money(restorePerYear ?? 0)}/yr.`;
  } else if (eroding && minPct < TARGET_TOP_PCT) {
    tone = "warn";
    headline = `${name} holds the 8% floor but erodes to about ${minPct.toFixed(0)}% of spending by ${fy(last.fiscalYear)} — inside the 8–10% cushion Mesa watches.`;
  } else {
    tone = "good";
    headline = `${name} keeps reserves above Mesa's 8% floor every year, ending about ${last.reservePct.toFixed(0)}% of next-year spending — within policy.`;
  }

  return {
    fundId: first.fundId,
    fundName: name,
    firstFiscalYear: first.fiscalYear,
    lastFiscalYear: last.fiscalYear,
    startReserve: first.reserveEnd,
    startPct: first.reservePct,
    endReserve: last.reserveEnd,
    endPct: last.reservePct,
    minPct,
    maintained,
    firstBreach,
    restorePerYear,
    tone,
    headline,
  };
}

// The adopted budget produces a fixed baseline trajectory; memoize it so every
// render can cheaply show "how your choices move the future fund balance".
let _baseline: ForecastYear[] | null = null;
export function getAdoptedBaselineForecast(): ForecastYear[] {
  if (!_baseline) _baseline = projectForecast(getInitialSnapshot(), 5);
  return _baseline;
}

export interface ReserveDelta {
  /** current final-year reserve − adopted final-year reserve. */
  endDelta: number;
  /** adopted-budget reserve by year, for overlaying as a baseline. */
  baseline: { fiscalYear: string; reserve: number }[];
}

/** How the user's plan shifts a fund's reserve trajectory vs the adopted budget. */
export function getReserveDeltaVsAdopted(fundId: string, current: ForecastYear[]): ReserveDelta {
  const base = getFundSeries(getAdoptedBaselineForecast(), fundId);
  const cur = getFundSeries(current, fundId);
  const endDelta = (cur[cur.length - 1]?.reserveEnd ?? 0) - (base[base.length - 1]?.reserveEnd ?? 0);
  return {
    endDelta,
    baseline: base.map((s) => ({ fiscalYear: s.fiscalYear, reserve: s.reserveEnd })),
  };
}

export { forecastAssumptions };
