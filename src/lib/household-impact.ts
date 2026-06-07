import householdData from "../../data/household.json";
import type { BudgetLevers } from "./funds-model";
import { meta } from "./funds-model";

export interface HouseholdProfile {
  annualSpending: number;
  taxableHomeValue: number;
  isUtilityCustomer: boolean;
}

export interface ReceiptLine {
  id: string;
  label: string;
  amount: number;
  pct: number;
}

export interface HouseholdImpact {
  localSalesTax: number;
  propertyTax: number;
  utilityBillsAnnual: number;
  environmentalFee: number;
  totalAnnual: number;
  monthlyTotal: number;
  rateChangeDelta: number;
  receiptLines: ReceiptLine[];
}

const household = householdData;

export function getDefaultHousehold(): HouseholdProfile {
  return {
    annualSpending: household.salesTax.medianAnnualSpending,
    taxableHomeValue: household.medianHome.taxableValue,
    isUtilityCustomer: true,
  };
}

export function calculateHouseholdImpact(
  profile: HouseholdProfile,
  levers: BudgetLevers,
): HouseholdImpact {
  const baseRate = meta.localSalesTaxRatePct ?? household.salesTax.localRatePct;
  const localSalesTax = Math.round(profile.annualSpending * (levers.localSalesTaxRatePct / 100));
  const baseLocalTax = Math.round(profile.annualSpending * (baseRate / 100));
  const propertyTax = Math.round(
    profile.taxableHomeValue * (household.medianHome.ratePer100Taxable / 100),
  );

  const utility = household.typicalUtilityCustomer;
  const rateMult = levers.utilityRateMultiplier;
  const utilityBillsAnnual = profile.isUtilityCustomer
    ? Math.round(utility.annualTotal * rateMult)
    : 0;
  const environmentalFee = profile.isUtilityCustomer
    ? Math.round(utility.environmentalComplianceFeeMonthly * 12)
    : 0;

  const totalAnnual = localSalesTax + propertyTax + utilityBillsAnnual + environmentalFee;
  const baseUtility = profile.isUtilityCustomer ? utility.annualTotal : 0;
  const rateChangeDelta =
    localSalesTax - baseLocalTax + (utilityBillsAnnual - baseUtility);

  const gfTotal = meta.fundCategoryTotals?.generalFund ?? 667_616_315;
  const receiptLines: ReceiptLine[] = household.receiptCategories.map((cat) => {
    const pct = cat.generalFundPct ?? cat.restrictedPct ?? 0;
    const amount = Math.round(localSalesTax * pct);
    return { id: cat.id, label: cat.label, amount, pct: pct * 100 };
  });

  return {
    localSalesTax,
    propertyTax,
    utilityBillsAnnual,
    environmentalFee,
    totalAnnual,
    monthlyTotal: Math.round(totalAnnual / 12),
    rateChangeDelta,
    receiptLines,
  };
}

export interface UtilityBillImpact {
  ratePct: number;
  residentialBaseMonthly: number;
  residentialMonthly: number;
  residentialAnnual: number;
  residentialMonthlyDelta: number;
  residentialAnnualDelta: number;
  commercialBaseMonthly: number;
  commercialMonthly: number;
  commercialAnnual: number;
  commercialMonthlyDelta: number;
  commercialAnnualDelta: number;
}

/**
 * Translate a utility-rate multiplier into concrete bill changes for a typical
 * residential and a typical commercial customer. This is how a Council rate
 * decision shows up on real people's bills.
 */
export function calculateUtilityBillImpact(rateMultiplier: number): UtilityBillImpact {
  const resBaseMonthly = household.typicalUtilityCustomer.annualTotal / 12;
  const comBaseMonthly = household.typicalCommercialCustomer.annualTotal / 12;
  const resMonthly = resBaseMonthly * rateMultiplier;
  const comMonthly = comBaseMonthly * rateMultiplier;
  return {
    ratePct: Math.round((rateMultiplier - 1) * 1000) / 10,
    residentialBaseMonthly: Math.round(resBaseMonthly),
    residentialMonthly: Math.round(resMonthly),
    residentialAnnual: Math.round(resMonthly * 12),
    residentialMonthlyDelta: Math.round(resMonthly - resBaseMonthly),
    residentialAnnualDelta: Math.round((resMonthly - resBaseMonthly) * 12),
    commercialBaseMonthly: Math.round(comBaseMonthly),
    commercialMonthly: Math.round(comMonthly),
    commercialAnnual: Math.round(comMonthly * 12),
    commercialMonthlyDelta: Math.round(comMonthly - comBaseMonthly),
    commercialAnnualDelta: Math.round((comMonthly - comBaseMonthly) * 12),
  };
}

export { householdData as household };
