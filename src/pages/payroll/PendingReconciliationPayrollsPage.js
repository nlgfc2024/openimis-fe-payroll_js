import React from 'react';
import { useSelector } from 'react-redux';
import { makeStyles } from '@material-ui/styles';
import { Helmet, PageFeedbackBanner, useModulesManager, useTranslations } from '@openimis/fe-core';
import { MODULE_NAME, PAYROLL_STATUS, RIGHT_PAYROLL_SEARCH } from '../../constants';
import PayrollSearcherApproved from '../../components/payroll/PayrollSearcherApproved';
import PaymentReconciliationSummaryDialog from '../../components/payroll/dialogs/PaymentReconciliationSummaryDialog';

const useStyles = makeStyles((theme) => ({ page: theme.page }));

function PendingReconciliationPayrollsPage() {
  const modulesManager = useModulesManager();
  const classes = useStyles();
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('payroll.route.payrollsPendingReconciliation')} />
      <PageFeedbackBanner />
      {rights.includes(RIGHT_PAYROLL_SEARCH) && (
        <PayrollSearcherApproved
          classes={classes}
          status={PAYROLL_STATUS.PENDING_RECONCILIATION}
          SummaryDialog={PaymentReconciliationSummaryDialog}
        />
      )}
    </div>
  );
}

export default PendingReconciliationPayrollsPage;
