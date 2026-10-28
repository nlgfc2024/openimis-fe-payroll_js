import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import { useModulesManager, useTranslations } from '@openimis/fe-core';
import PayrollPage from '../../pages/payroll/PayrollPage';
import ReconciliationUploadRowsDialog from '../payroll/dialogs/ReconciliationUploadRowsDialog';
import { MODULE_NAME } from '../../constants';

const PayrollReconciliationTaskTableHeaders = () => [
  'District reconciliation review',
];

function DistrictReconciliationTask({ data }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  if (!data?.district) return <PayrollPage taskPayrollUuid={data?.id} />;
  const summary = data.summary || {};
  return (
    <div>
      <Typography><strong>{formatMessage('payroll.districtBatch.district')}:</strong> {data.district}</Typography>
      <Typography><strong>{formatMessage('payroll.districtBatch.phase')}:</strong> {data.phase}</Typography>
      <Typography>
        <strong>{formatMessage('payroll.districtBatch.records')}:</strong> {summary.total_records || 0} {formatMessage('payroll.districtBatch.totalLabel')}, {summary.matched_records || 0} {formatMessage('payroll.districtBatch.matchedLabel')},
        {' '}{summary.paid_records || 0} {formatMessage('payroll.districtBatch.paidLabel')}, {summary.unpaid_records || 0} {formatMessage('payroll.districtBatch.unpaidLabel')},
        {' '}{summary.unmatched_records || 0} {formatMessage('payroll.districtBatch.unmatchedLabel')}
      </Typography>
      <Table size="small">
        <TableHead><TableRow><TableCell>{formatMessage('payroll.districtBatch.sourcePayrollId')}</TableCell><TableCell>{formatMessage('payroll.districtBatch.sourcePayrollName')}</TableCell></TableRow></TableHead>
        <TableBody>{(data.included_payrolls || []).map((payroll) => (
          <TableRow key={payroll.id}><TableCell>{payroll.id}</TableCell><TableCell>{payroll.name}</TableCell></TableRow>
        ))}</TableBody>
      </Table>
      <ReconciliationUploadRowsDialog upload={{ id: data.upload_id, fileName: formatMessage('payroll.districtBatch.reconciliationFileName') }} />
    </div>
  );
}

const PayrollReconciliationTaskItemFormatters = () => [
  (data) => (
    <DistrictReconciliationTask data={data} />
  ),
];

export { PayrollReconciliationTaskTableHeaders, PayrollReconciliationTaskItemFormatters };
