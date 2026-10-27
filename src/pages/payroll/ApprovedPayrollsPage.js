import React from 'react';
import { useSelector } from 'react-redux';

import { makeStyles } from '@material-ui/styles';

import {
  Helmet,
  PageFeedbackBanner,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import {
  MODULE_NAME,
  RIGHT_PAYROLL_SEARCH,
} from '../../constants';
import PayrollSearcherApproved from '../../components/payroll/PayrollSearcherApproved';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  fab: theme.fab,
  button: {
    margin: theme.spacing(1, 2, 1, 1),
    whiteSpace: 'nowrap',
  },
}));

function ApprovedPayrollsPage() {
  const modulesManager = useModulesManager();
  const classes = useStyles();
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('paymentPoint.page.title')} />
      <PageFeedbackBanner />
      {rights.includes(RIGHT_PAYROLL_SEARCH)
        && <PayrollSearcherApproved classes={classes} />}
    </div>
  );
}

export default ApprovedPayrollsPage;
