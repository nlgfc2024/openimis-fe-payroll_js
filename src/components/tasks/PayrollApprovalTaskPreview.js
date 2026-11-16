import React, { useState } from 'react';
import {
  Button, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@material-ui/core';
import { useModulesManager, useTranslations } from '@openimis/fe-core';
import PayrollPage from '../../pages/payroll/PayrollPage';
import { MODULE_NAME } from '../../constants';

const taskData = (task) => {
  const value = task?.businessData?.incoming_data || task?.businessData || {};
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (error) {
    return {};
  }
};

export default function PayrollApprovalTaskPreview({ task }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const data = taskData(task);
  const sourcePayrolls = data?.consolidated ? data?.included_payrolls || [] : [];
  const [selectedPayrollId, setSelectedPayrollId] = useState(null);

  if (!data?.consolidated) {
    return <PayrollPage taskPayrollUuid={data?.id} />;
  }

  const payrollToReview = selectedPayrollId || data?.id;
  return (
    <>
      <Typography variant="subtitle1">
        {formatMessage('payroll.consolidation.sourcePayrolls')}
      </Typography>
      <Button
        color="primary"
        aria-pressed={!selectedPayrollId}
        onClick={() => setSelectedPayrollId(null)}
      >
        {formatMessage('payroll.consolidation.consolidatedPayroll')}
      </Button>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{formatMessage('payroll.consolidation.sourcePayroll')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sourcePayrolls.map((payroll) => (
            <TableRow key={payroll.id} selected={payroll.id === selectedPayrollId}>
              <TableCell>
                <Button
                  color="primary"
                  aria-pressed={payroll.id === selectedPayrollId}
                  onClick={() => setSelectedPayrollId(payroll.id)}
                >
                  {payroll.name}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {payrollToReview && <PayrollPage key={payrollToReview} taskPayrollUuid={payrollToReview} />}
    </>
  );
}
