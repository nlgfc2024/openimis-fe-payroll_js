import React from 'react';
import {
  StatusChip,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import { MODULE_NAME, PAYROLL_STATUS } from '../../constants';

const PAYROLL_STATUS_SEVERITY = {
  [PAYROLL_STATUS.PENDING_APPROVAL]: 'warning',
  [PAYROLL_STATUS.APPROVE_FOR_PAYMENT]: 'success',
  [PAYROLL_STATUS.REJECTED]: 'error',
  [PAYROLL_STATUS.RECONCILED]: 'success',
  [PAYROLL_STATUS.RECONCILIATED]: 'success',
};

function PayrollStatusChip({ status }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);

  if (!status) return null;

  return (
    <StatusChip
      label={formatMessage(`payroll.payroll.payrollStatusPicker.${status}`)}
      severity={PAYROLL_STATUS_SEVERITY[status]}
    />
  );
}

export default PayrollStatusChip;
