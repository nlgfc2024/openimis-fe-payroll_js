import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { IconButton, Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import AddIcon from '@material-ui/icons/Add';
import VisibilityIcon from '@material-ui/icons/Visibility';
import DeleteIcon from '@material-ui/icons/Delete';

import {
  Searcher,
  useHistory,
  useModulesManager,
  useTranslations,
  coreConfirm,
  clearConfirm,
  journalize,
} from '@openimis/fe-core';
import PayrollFilter from './PayrollFilter';
import PayrollStatusChip from './PayrollStatusChip';
import {
  DEFAULT_PAGE_SIZE, MODULE_NAME, PAYROLL_PAYROLL_ROUTE,
  RIGHT_PAYROLL_CREATE,
  RIGHT_PAYROLL_SEARCH, ROWS_PER_PAGE_OPTIONS, PAYROLL_STATUS,
} from '../../constants';
import { mutationLabel, pageTitle } from '../../utils/string-utils';
import { payrollListColumns } from '../../utils/payroll-ui-config';
import { fetchPayrolls, deletePayrolls } from '../../actions';

const useStyles = makeStyles(() => ({
  paymentMethod: {
    display: 'block',
    maxWidth: '100%',
    overflowWrap: 'anywhere',
  },
  rowActions: {
    display: 'inline-flex',
    whiteSpace: 'nowrap',
  },
}));

function PayrollSearcher({
  deletePayrolls,
  fetchingPayrolls,
  fetchedPayrolls,
  errorPayrolls,
  payrolls,
  pageInfo,
  totalCount,
  fetchPayrolls,
  coreConfirm,
  clearConfirm,
  confirmed,
  submittingMutation,
  mutation,
}) {
  const classes = useStyles();
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);
  const onCreate = () => history.push(
    `/${modulesManager.getRef(PAYROLL_PAYROLL_ROUTE)}`,
  );

  const searcherActions = () => [{
    label: formatMessage('payroll.createButton.label'),
    icon: <AddIcon />,
    authorized: rights.includes(RIGHT_PAYROLL_CREATE),
    onClick: onCreate,
    variant: 'contained',
  }];

  const [payrollToDelete, setPayrollToDelete] = useState(null);
  const [deletedPayrollUuids, setDeletedPayrollUuids] = useState([]);
  const prevSubmittingMutationRef = useRef();

  const openDeletePayrollConfirmDialog = () => {
    coreConfirm(
      formatMessageWithValues('payroll.delete.confirm.title', pageTitle(payrollToDelete)),
      formatMessage('payroll.delete.confirm.message'),
      null,
      'warning',
    );
  };

  useEffect(() => payrollToDelete && openDeletePayrollConfirmDialog(), [payrollToDelete]);

  useEffect(() => {
    if (payrollToDelete && confirmed) {
      deletePayrolls(
        payrollToDelete,
        formatMessageWithValues('payroll.mutation.deleteLabel', mutationLabel(payrollToDelete)),
      );
      setDeletedPayrollUuids([...deletedPayrollUuids, payrollToDelete.id]);
    }
    if (payrollToDelete && confirmed !== null) {
      setPayrollToDelete(null);
    }
    return () => confirmed && clearConfirm(false);
  }, [confirmed]);

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
    }
  }, [submittingMutation]);

  useEffect(() => {
    prevSubmittingMutationRef.current = submittingMutation;
  });

  const defaultFilters = () => ({
    isDeleted: {
      value: false,
      filter: 'isDeleted: false',
    },
  });

  const fetch = (params) => fetchPayrolls(modulesManager, params);

  const rowIdentifier = (payroll) => payroll.id;

  const openPayroll = (payroll) => rights.includes(RIGHT_PAYROLL_SEARCH) && history.push(
    `/${modulesManager.getRef(PAYROLL_PAYROLL_ROUTE)}/${payroll?.id}`,
  );

  const onDelete = (payroll) => setPayrollToDelete(payroll);

  const columns = payrollListColumns(modulesManager, [
    {
      key: 'name',
      header: 'payroll.name',
      sort: ['name', true],
      width: '20%',
      formatter: (payroll) => payroll.name,
    },
    {
      key: 'paymentPlan',
      header: 'payroll.paymentPlan',
      sort: ['paymentPlan', true],
      width: '20%',
      formatter: (payroll) => (payroll.paymentPlan
        ? `${payroll.paymentPlan.code} ${payroll.paymentPlan.name}` : ''),
    },
    {
      key: 'status',
      header: 'payroll.status',
      sort: ['status', true],
      width: '16%',
      formatter: (payroll) => <PayrollStatusChip status={payroll.status} />,
    },
    {
      key: 'paymentPoint',
      header: 'payroll.paymentPoint',
      sort: ['paymentPoint', true],
      width: '16%',
      formatter: (payroll) => (payroll.paymentPoint
        ? `${payroll.paymentPoint.name}` : ''),
    },
    {
      key: 'paymentMethod',
      header: 'payroll.paymentMethod',
      sort: ['paymentMethod', true],
      formatter: (payroll) => (payroll.paymentMethod ? (
        <Tooltip title={payroll.paymentMethod}>
          <span className={classes.paymentMethod}>
            {payroll.paymentMethod}
          </span>
        </Tooltip>
      ) : ''),
    },
    {
      key: 'actions',
      header: 'emptyLabel',
      width: '112px',
      formatter: (payroll) => (
      <span className={classes.rowActions}>
        <Tooltip title={formatMessage('tooltip.viewDetails')}>
          <IconButton onClick={() => openPayroll(payroll)}>
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={formatMessage('tooltip.delete')}>
          <IconButton
            onClick={() => onDelete(payroll)}
            disabled={deletedPayrollUuids.includes(payroll.id) || payroll.status !== PAYROLL_STATUS.PENDING_APPROVAL}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </span>
      ),
    },
  ]);

  const onDoubleClick = (payroll) => openPayroll(payroll);

  const payrollFilter = ({ filters, onChangeFilters }) => (
    <PayrollFilter filters={filters} onChangeFilters={onChangeFilters} />
  );

  const isRowDisabled = (_, payroll) => deletedPayrollUuids.includes(payroll.id);

  return (
    <Searcher
      module="payroll"
      FilterPane={payrollFilter}
      fetch={fetch}
      items={payrolls}
      itemsPageInfo={pageInfo}
      fetchedItems={fetchedPayrolls}
      fetchingItems={fetchingPayrolls}
      errorItems={errorPayrolls}
      tableTitle={formatMessageWithValues('payrollSearcher.results', { totalCount })}
      headers={columns.headers}
      columnWidths={columns.columnWidths}
      itemFormatters={columns.itemFormatters}
      sorts={columns.sorts}
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      rowIdentifier={rowIdentifier}
      onDoubleClick={onDoubleClick}
      defaultFilters={defaultFilters()}
      rowDisabled={isRowDisabled}
      rowLocked={isRowDisabled}
      enableActionButtons
      searcherActionsPosition="header-right"
      searcherActions={searcherActions()}
    />
  );
}

const mapStateToProps = (state) => ({
  fetchingPayrolls: state.payroll.fetchingPayrolls,
  fetchedPayrolls: state.payroll.fetchedPayrolls,
  errorPayrolls: state.payroll.errorPayrolls,
  payrolls: state.payroll.payrolls,
  pageInfo: state.payroll.payrollsPageInfo,
  totalCount: state.payroll.payrollsTotalCount,
  confirmed: state.core.confirmed,
  submittingMutation: state.payroll.submittingMutation,
  mutation: state.payroll.mutation,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchPayrolls,
  deletePayrolls,
  journalize,
  clearConfirm,
  coreConfirm,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PayrollSearcher);
