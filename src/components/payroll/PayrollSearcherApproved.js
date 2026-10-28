import React, { useRef, useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';

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
import {
  DEFAULT_PAGE_SIZE, MODULE_NAME, PAYROLL_PAYROLL_ROUTE, RIGHT_PAYROLL_SEARCH, ROWS_PER_PAGE_OPTIONS, PAYROLL_STATUS,
} from '../../constants';
import { fetchPayrolls } from '../../actions';
import PaymentApproveForPaymentSummary from './dialogs/PaymentApproveForPaymentSummary';
import PayrollReconciliationFilesDialog from './dialogs/PayrollReconciliationFilesDialog';
import DistrictPayrollBatchDialog from './dialogs/DistrictPayrollBatchDialog';

function PayrollSearcherApproved({
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
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);
  const [districtBatchDialogMode, setDistrictBatchDialogMode] = useState(null);

  const prevSubmittingMutationRef = useRef();

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
    }
  }, [submittingMutation]);

  useEffect(() => {
    prevSubmittingMutationRef.current = submittingMutation;
  });

  const headers = () => [
    'payroll.name',
    'payroll.paymentPlan',
    'payroll.paymentPoint',
    'payroll.status',
    'payroll.paymentMethod',
    'emptyLabel',
  ];

  const sorts = () => [
    ['name', true],
    ['paymentPlan', true],
    ['paymentPoint', true],
    ['status', true],
    ['paymentMethod', true],
  ];

  const defaultFilters = () => ({
    isDeleted: {
      value: false,
      filter: 'isDeleted: false',
    },
    status: {
      value: PAYROLL_STATUS.APPROVE_FOR_PAYMENT,
      filter: `status: ${PAYROLL_STATUS.APPROVE_FOR_PAYMENT}`,
    },
  });

  const fetch = (params) => fetchPayrolls(modulesManager, params);

  const rowIdentifier = (payroll) => payroll.id;

  const openPayroll = (payroll) => rights.includes(RIGHT_PAYROLL_SEARCH) && history.push(
    `/${modulesManager.getRef(PAYROLL_PAYROLL_ROUTE)}/${payroll?.id}`,
  );

  const itemFormatters = () => [
    (payroll) => payroll.name,
    (payroll) => (payroll.benefitPlan
      ? `${payroll.benefitPlan.code} ${payroll.benefitPlan.name}` : ''),
    (payroll) => (payroll.paymentPoint
      ? `${payroll.paymentPoint.name}` : ''),
    (payroll) => (payroll.status
      ? `${payroll.status}` : ''),
    (payroll) => (payroll.paymentMethod
      ? `${payroll.paymentMethod}` : ''),
    (payroll) => (
      <span style={{ display: 'inline-flex', whiteSpace: 'nowrap' }}>
        <PayrollReconciliationFilesDialog classes={classes} payroll={payroll} />
        <PaymentApproveForPaymentSummary classes={classes} payrollDetail={payroll} />
      </span>
    ),
  ];

  const onDoubleClick = (payroll) => openPayroll(payroll);

  const payrollFilter = ({ filters, onChangeFilters }) => (
    <PayrollFilter filters={filters} onChangeFilters={onChangeFilters} statusReadOnly />
  );

  const searcherActions = () => [
    {
      label: formatMessage('payroll.districtBatch.uploadAction'),
      icon: <CloudUploadIcon />,
      authorized: rights.includes(RIGHT_PAYROLL_SEARCH),
      onClick: () => setDistrictBatchDialogMode('upload'),
      variant: 'outlined',
    },
  ];

  return (
    <>
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
      headers={headers}
      columnWidths={['20%', '20%', '16%', '16%', undefined, '112px']}
      itemFormatters={itemFormatters}
      sorts={sorts}
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      rowIdentifier={rowIdentifier}
      onDoubleClick={onDoubleClick}
      defaultFilters={defaultFilters()}
      enableActionButtons
      searcherActionsPosition="header-right"
      searcherActions={searcherActions()}
      compactLayout
      />
      <DistrictPayrollBatchDialog
        open={Boolean(districtBatchDialogMode)}
        mode={districtBatchDialogMode || 'download'}
        onClose={() => setDistrictBatchDialogMode(null)}
      />
    </>
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

export default connect(mapStateToProps, mapDispatchToProps)(PayrollSearcherApproved);
