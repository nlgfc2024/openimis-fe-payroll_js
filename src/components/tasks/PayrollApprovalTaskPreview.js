import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import { useHistory, useModulesManager, useTranslations } from '@openimis/fe-core';
import PayrollPage from '../../pages/payroll/PayrollPage';
import { MODULE_NAME, PAYROLL_PAYROLL_ROUTE } from '../../constants';

const taskData = (task) => {
  const value = task?.businessData?.incoming_data || task?.businessData || {};
  try { return typeof value === 'string' ? JSON.parse(value) : value; } catch (error) { return {}; }
};

export default function PayrollApprovalTaskPreview({ task }) {
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const data = taskData(task);
  const sourcePayrolls = data?.included_payrolls || [];
  return <>
    {data?.consolidated && <>
      <Typography variant="subtitle1">{formatMessage('payroll.consolidation.sourcePayrolls')}</Typography>
      <Table size="small"><TableHead><TableRow><TableCell>{formatMessage('payroll.consolidation.sourcePayroll')}</TableCell></TableRow></TableHead><TableBody>
        {sourcePayrolls.map((payroll) => <TableRow key={payroll.id}><TableCell><button type="button" onClick={() => history.push(`/${modulesManager.getRef(PAYROLL_PAYROLL_ROUTE)}/${payroll.id}`)}>{payroll.name}</button></TableCell></TableRow>)}
      </TableBody></Table>
    </>}
    <PayrollPage taskPayrollUuid={data?.id} />
  </>;
}
