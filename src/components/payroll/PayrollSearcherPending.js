import React, { useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

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
  DEFAULT_PAGE_SIZE, MODULE_NAME, PAYROLL_PAYROLL_ROUTE, RIGHT_PAYROLL_SEARCH, ROWS_PER_PAGE_OPTIONS, PAYROLL_STATUS,
} from '../../constants';
import { fetchPayrolls } from '../../actions';
import PayrollReconciliationFilesDialog from './dialogs/PayrollReconciliationFilesDialog';
import PayrollPendingPayrollSummary from './dialogs/PayrollPendingPayrollSummary';
import { payrollListColumns } from '../../utils/payroll-ui-config';

function PayrollSearcherPending({
  fetchingPayrolls,
  fetchedPayrolls,
  errorPayrolls,
  payrolls,
  pageInfo,
  totalCount,
  fetchPayrolls,
  submittingMutation,
  mutation,
  classes,
}) {
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);

  const prevSubmittingMutationRef = useRef();

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
    status: {
      value: PAYROLL_STATUS.PENDING_APPROVAL,
      filter: `status: ${PAYROLL_STATUS.PENDING_APPROVAL}`,
    },
  });

  const fetch = (params) => fetchPayrolls(modulesManager, params);

  const rowIdentifier = (payroll) => payroll.id;

  const openPayroll = (payroll) => rights.includes(RIGHT_PAYROLL_SEARCH) && history.push(
    `/${modulesManager.getRef(PAYROLL_PAYROLL_ROUTE)}/${payroll?.id}`,
  );

  const columns = payrollListColumns(modulesManager, [
    {
      key: 'name',
      header: 'payroll.name',
      sort: ['name', true],
      formatter: (payroll) => payroll.name,
    },
    {
      key: 'paymentPlan',
      header: 'payroll.paymentPlan',
      sort: ['paymentPlan', true],
      formatter: (payroll) => (payroll.paymentPlan
        ? `${payroll.paymentPlan.code} ${payroll.paymentPlan.name}` : ''),
    },
    {
      key: 'status',
      header: 'payroll.status',
      sort: ['status', true],
      formatter: (payroll) => <PayrollStatusChip status={payroll.status} />,
    },
    {
      key: 'paymentPoint',
      header: 'payroll.paymentPoint',
      sort: ['paymentPoint', true],
      formatter: (payroll) => (payroll.paymentPoint
        ? `${payroll.paymentPoint.name}` : ''),
    },
    {
      key: 'paymentMethod',
      header: 'payroll.paymentMethod',
      sort: ['paymentMethod', true],
      formatter: (payroll) => (payroll.paymentMethod
        ? `${payroll.paymentMethod}` : ''),
    },
    {
      key: 'reconciliationFiles',
      header: 'emptyLabel',
      formatter: (payroll) => (
        <PayrollReconciliationFilesDialog classes={classes} payroll={payroll} />
      ),
    },
    {
      key: 'summary',
      header: 'emptyLabel',
      formatter: (payroll) => (
        <PayrollPendingPayrollSummary classes={classes} payrollDetail={payroll} />
      ),
    },
  ]);

  const onDoubleClick = (payroll) => openPayroll(payroll);

  const payrollFilter = ({ filters, onChangeFilters }) => (
    <PayrollFilter filters={filters} onChangeFilters={onChangeFilters} statusReadOnly />
  );

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
  journalize,
  clearConfirm,
  coreConfirm,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PayrollSearcherPending);
