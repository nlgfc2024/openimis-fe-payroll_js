export const getPaymentPlanBenefitPlan = (paymentPlan) => {
  let benefitPlan = paymentPlan?.benefitPlan;
  for (let attempt = 0; attempt < 2 && typeof benefitPlan === 'string'; attempt += 1) {
    try {
      benefitPlan = JSON.parse(benefitPlan);
    } catch {
      return null;
    }
  }
  return benefitPlan && typeof benefitPlan === 'object' && !Array.isArray(benefitPlan)
    ? benefitPlan
    : null;
};

export const getPaymentPlanBenefitPlanId = (paymentPlan) => (
  getPaymentPlanBenefitPlan(paymentPlan)?.id ?? null
);

export const formatAmountWithoutCurrency = (amount, modulesManager) => {
  const amountLocale = modulesManager.getConf('fe-core', 'thousandSeparator', 'en');
  const amountDecimals = modulesManager.getConf('fe-core', 'numberOfDecimals', 2);
  if (!amountLocale) return Number(amount).toFixed(amountDecimals);

  return new Intl.NumberFormat(amountLocale, {
    minimumFractionDigits: amountDecimals,
    maximumFractionDigits: amountDecimals,
  }).format(amount || 0);
};

export const isPaymentPlanActive = (paymentPlan, now = new Date()) => {
  if (!paymentPlan || paymentPlan.isDeleted) return false;
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const validFrom = paymentPlan.dateValidFrom
    ? String(paymentPlan.dateValidFrom).slice(0, 10)
    : null;
  const validTo = paymentPlan.dateValidTo
    ? String(paymentPlan.dateValidTo).slice(0, 10)
    : null;
  return (!validFrom || validFrom <= today) && (!validTo || validTo >= today);
};
