export const PAYROLL_CONFIG_MODULE = 'fe-payroll';

export const HIDDEN_PAYROLL_LIST_COLUMNS_CONFIG = 'hiddenPayrollListColumns';
export const HIDDEN_PAYROLL_FORM_FIELDS_CONFIG = 'hiddenPayrollFormFields';
export const DEFAULT_PAYMENT_PLAN_ID_CONFIG = 'defaultPaymentPlanId';
export const DEFAULT_PAYMENT_METHOD_CONFIG = 'defaultPaymentMethod';
export const DEFAULT_PAYMENT_POINT_ID_CONFIG = 'defaultPaymentPointId';

export const payrollListColumns = (modulesManager, columns) => {
  const hiddenColumns = modulesManager.getConf(
    PAYROLL_CONFIG_MODULE,
    HIDDEN_PAYROLL_LIST_COLUMNS_CONFIG,
    [],
  );
  const hidden = new Set(Array.isArray(hiddenColumns) ? hiddenColumns : []);
  const visible = columns.filter(({ key }) => !hidden.has(key));

  return {
    headers: () => visible.map(({ header }) => header),
    sorts: () => visible
      .filter(({ sort }) => sort)
      .map(({ sort }) => sort),
    itemFormatters: () => visible.map(({ formatter }) => formatter),
    columnWidths: visible.map(({ width }) => width),
  };
};

export const hiddenPayrollFormFields = (modulesManager) => {
  const hiddenFields = modulesManager.getConf(
    PAYROLL_CONFIG_MODULE,
    HIDDEN_PAYROLL_FORM_FIELDS_CONFIG,
    [],
  );
  return new Set(Array.isArray(hiddenFields) ? hiddenFields : []);
};
