import React from 'react';
import { Tab, Table, TableBody, TableCell, TableHead, TableRow } from '@material-ui/core';
import { PublishedComponent, useGraphqlQuery, useHistory, useModulesManager, useTranslations } from '@openimis/fe-core';
import { MODULE_NAME, PAYROLL_PAYROLL_ROUTE, RIGHT_PAYROLL_SEARCH } from '../../constants';

export const CONSOLIDATED_PAYROLLS_TAB_VALUE = 'consolidatedPayrollsTab';

export function ConsolidatedPayrollsTabLabel({
  onChange, tabStyle, isSelected, modulesManager, isInTask,
}) {
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  if (isInTask) return null;
  return <Tab onChange={onChange} className={tabStyle(CONSOLIDATED_PAYROLLS_TAB_VALUE)} selected={isSelected(CONSOLIDATED_PAYROLLS_TAB_VALUE)} value={CONSOLIDATED_PAYROLLS_TAB_VALUE} label={formatMessage('payroll.consolidation.sourcePayrolls')} />;
}

export function ConsolidatedPayrollsTabPanel({
  value, rights, payrollUuid, isInTask,
}) {
  const modulesManager = useModulesManager();
  const history = useHistory();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const { data } = useGraphqlQuery(`query ConsolidatedPayroll($id: UUID!) { payroll(id: $id) { edges { node { payrollType consolidatedMembers { sourcePayrollId sourcePayrollName sourcePayrollStatus beneficiariesCount totalAmount } } } } }`, { id: payrollUuid }, { skip: !payrollUuid || isInTask });
  const payroll = data?.payroll?.edges?.[0]?.node;
  if (isInTask || payroll?.payrollType !== 'CONSOLIDATED') return null;
  return <PublishedComponent pubRef="policyHolder.TabPanel" module="payroll" index={CONSOLIDATED_PAYROLLS_TAB_VALUE} value={value}>
    <Table size="small"><TableHead><TableRow><TableCell>{formatMessage('payroll.consolidation.sourcePayroll')}</TableCell><TableCell>{formatMessage('payroll.summary.beneficiaries')}</TableCell><TableCell>{formatMessage('payroll.amount')}</TableCell><TableCell>{formatMessage('payroll.status')}</TableCell></TableRow></TableHead><TableBody>
      {(payroll.consolidatedMembers || []).map((member) => <TableRow key={member.sourcePayrollId}><TableCell><button type="button" onClick={() => history.push(`/${modulesManager.getRef(PAYROLL_PAYROLL_ROUTE)}/${member.sourcePayrollId}`)} disabled={!rights.includes(RIGHT_PAYROLL_SEARCH)}>{member.sourcePayrollName}</button></TableCell><TableCell>{member.beneficiariesCount}</TableCell><TableCell>{member.totalAmount}</TableCell><TableCell>{member.sourcePayrollStatus}</TableCell></TableRow>)}
    </TableBody></Table>
  </PublishedComponent>;
}
