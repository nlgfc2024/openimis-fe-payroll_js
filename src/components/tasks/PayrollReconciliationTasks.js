import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import PayrollPage from '../../pages/payroll/PayrollPage';
import ReconciliationUploadRowsDialog from '../payroll/dialogs/ReconciliationUploadRowsDialog';

const PayrollReconciliationTaskTableHeaders = () => [
  'District reconciliation review',
];

const PayrollReconciliationTaskItemFormatters = () => [
  (data) => {
    if (!data?.district) return <PayrollPage taskPayrollUuid={data?.id} />;
    const summary = data.summary || {};
    return (
      <div>
        <Typography><strong>District:</strong> {data.district}</Typography>
        <Typography><strong>Phase:</strong> {data.phase}</Typography>
        <Typography>
          <strong>Records:</strong> {summary.total_records || 0} total, {summary.matched_records || 0} matched,
          {' '}{summary.paid_records || 0} paid, {summary.unpaid_records || 0} unpaid,
          {' '}{summary.unmatched_records || 0} unmatched
        </Typography>
        <Table size="small">
          <TableHead><TableRow><TableCell>Source Payroll ID</TableCell><TableCell>Source Payroll Name</TableCell></TableRow></TableHead>
          <TableBody>{(data.included_payrolls || []).map((payroll) => (
            <TableRow key={payroll.id}><TableCell>{payroll.id}</TableCell><TableCell>{payroll.name}</TableCell></TableRow>
          ))}</TableBody>
        </Table>
        <ReconciliationUploadRowsDialog upload={{ id: data.upload_id, fileName: 'District reconciliation' }} />
      </div>
    );
  },
];

export { PayrollReconciliationTaskTableHeaders, PayrollReconciliationTaskItemFormatters };
