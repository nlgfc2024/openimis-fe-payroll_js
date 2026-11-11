const summary = (data) => data?.summary || {};

const PayrollReconciliationTaskTableHeaders = () => [
  'District',
  'Phase',
  'Uploaded rows',
  'Matched',
  'Paid',
  'Unpaid',
  'Needs review',
];

const PayrollReconciliationTaskItemFormatters = () => [
  (data) => data?.district,
  (data) => data?.phase,
  (data) => summary(data).total_records,
  (data) => summary(data).matched_records,
  (data) => summary(data).paid_records,
  (data) => summary(data).unpaid_records,
  (data) => summary(data).unmatched_records,
];

export { PayrollReconciliationTaskTableHeaders, PayrollReconciliationTaskItemFormatters };
