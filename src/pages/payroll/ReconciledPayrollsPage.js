import React from 'react';
import { useSelector } from 'react-redux';

import { makeStyles } from '@material-ui/styles';

import {
  Helmet,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import {
  MODULE_NAME,
  RIGHT_PAYROLL_SEARCH,
} from '../../constants';
import PayrollSearcherReconciled from '../../components/payroll/PayrollSearcherReconciled';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  fab: theme.fab,
  button: {
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0,
    padding: theme.spacing(0.75, 0.5),
    whiteSpace: 'normal',
    lineHeight: 1.2,
    overflowWrap: 'anywhere',
    '& .MuiButton-label': {
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
      wordBreak: 'normal',
    },
  },
}));

function ReconciledPayrollsPage() {
  const modulesManager = useModulesManager();
  const classes = useStyles();
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('paymentPoint.page.title')} />
      {rights.includes(RIGHT_PAYROLL_SEARCH)
        && <PayrollSearcherReconciled classes={classes} />}
    </div>
  );
}

export default ReconciledPayrollsPage;
