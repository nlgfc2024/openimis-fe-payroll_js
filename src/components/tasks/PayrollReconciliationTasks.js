const summary = (data) => data?.summary || {};

const payrollNames = (data) => (data?.included_payrolls || [])
  .map((payroll) => payroll?.name)
  .filter(Boolean)
  .join(', ');

const PayrollReconciliationTaskTableHeaders = () => [
  'District',
  'Phase',
  'Payrolls',
  'Uploaded rows',
  'Matched',
  'Paid',
  'Unpaid',
  'Needs review',
];

const PayrollReconciliationTaskItemFormatters = () => [
  (data) => data?.district,
  (data) => data?.phase,
  payrollNames,
  (data) => summary(data).total_records,
  (data) => summary(data).matched_records,
  (data) => summary(data).paid_records,
  (data) => summary(data).unpaid_records,
  (data) => summary(data).unmatched_records,
];

export { PayrollReconciliationTaskTableHeaders, PayrollReconciliationTaskItemFormatters };
