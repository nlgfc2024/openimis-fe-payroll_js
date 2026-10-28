import React, { useRef, useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { IconButton, Tooltip } from '@material-ui/core';
import VisibilityIcon from '@material-ui/icons/Visibility';

import {
  Searcher,
  useHistory,
  useModulesManager,
  useTranslations,
  coreConfirm,
  clearConfirm,
  journalize,
  apiHeaders,
  baseApiUrl,
} from '@openimis/fe-core';
import PayrollFilter from './PayrollFilter';
import {
  DEFAULT_PAGE_SIZE, MODULE_NAME, PAYROLL_PAYROLL_ROUTE, RIGHT_PAYROLL_SEARCH, ROWS_PER_PAGE_OPTIONS, PAYROLL_STATUS,
} from '../../constants';
import { fetchPayrolls } from '../../actions';
import PayrollReconciliationFilesDialog from './dialogs/PayrollReconciliationFilesDialog';
import PayrollPendingPayrollSummary from './dialogs/PayrollPendingPayrollSummary';
import DistrictWagesheetDetailsDialog from './dialogs/DistrictWagesheetDetailsDialog';

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
  const [districtWagesheets, setDistrictWagesheets] = useState([]);
  const [loadingDistrictWagesheets, setLoadingDistrictWagesheets] = useState(true);
  const [districtWagesheetsError, setDistrictWagesheetsError] = useState(null);
  const [selectedDistrictWagesheet, setSelectedDistrictWagesheet] = useState(null);

  const prevSubmittingMutationRef = useRef();

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
    }
  }, [submittingMutation]);

  useEffect(() => {
    prevSubmittingMutationRef.current = submittingMutation;
  });

  useEffect(() => {
    window.fetch(`${baseApiUrl}/payroll/district_reconciliation/?action=list`, {
      headers: apiHeaders(),
      credentials: 'same-origin',
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'District Wagesheets could not be loaded.');
        return payload.wagesheets || [];
      })
      .then((wagesheets) => setDistrictWagesheets(wagesheets.filter((wagesheet) => (
        ['PENDING_DISTRICT_APPROVAL', 'PENDING_NATIONAL_APPROVAL'].includes(wagesheet.status)
      ))))
      .catch((error) => setDistrictWagesheetsError(error.message))
      .finally(() => setLoadingDistrictWagesheets(false));
  }, []);

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
      value: PAYROLL_STATUS.PENDING_APPROVAL,
      filter: `status: ${PAYROLL_STATUS.PENDING_APPROVAL}`,
    },
  });

  const fetch = (params) => fetchPayrolls(modulesManager, params);

  const rowIdentifier = (payroll) => payroll.id;

  const pendingDistrictWagesheets = districtWagesheets.map((wagesheet) => ({
    id: `district-wagesheet-${wagesheet.id}`,
    name: wagesheet.name,
    benefitPlan: { code: '', name: wagesheet.phase },
    paymentPoint: { name: wagesheet.district },
    paymentMethod: 'District Wagesheet',
    status: wagesheet.status,
    districtWagesheet: wagesheet,
  }));
  const payrollRows = [...pendingDistrictWagesheets, ...payrolls];

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
    (payroll) => (payroll.districtWagesheet ? (
      <Tooltip title="View District Wagesheet">
        <IconButton onClick={() => setSelectedDistrictWagesheet(payroll.districtWagesheet)}>
          <VisibilityIcon />
        </IconButton>
      </Tooltip>
    ) : (
      <span style={{ display: 'inline-flex', whiteSpace: 'nowrap' }}>
        <PayrollReconciliationFilesDialog classes={classes} payroll={payroll} />
        <PayrollPendingPayrollSummary classes={classes} payrollDetail={payroll} />
      </span>
    )),
  ];

  const onDoubleClick = (payroll) => {
    if (payroll.districtWagesheet) {
      setSelectedDistrictWagesheet(payroll.districtWagesheet);
    } else {
      openPayroll(payroll);
    }
  };

  const payrollFilter = ({ filters, onChangeFilters }) => (
    <PayrollFilter filters={filters} onChangeFilters={onChangeFilters} statusReadOnly />
  );

  return (
    <>
    <Searcher
      module="payroll"
      FilterPane={payrollFilter}
      fetch={fetch}
      items={payrollRows}
      itemsPageInfo={pageInfo}
      fetchedItems={fetchedPayrolls}
      fetchingItems={fetchingPayrolls || loadingDistrictWagesheets}
      errorItems={errorPayrolls || districtWagesheetsError}
      tableTitle={formatMessageWithValues('payrollSearcher.results', { totalCount: totalCount + pendingDistrictWagesheets.length })}
      headers={headers}
      columnWidths={['20%', '20%', '16%', '16%', undefined, '112px']}
      itemFormatters={itemFormatters}
      sorts={sorts}
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      rowIdentifier={rowIdentifier}
      onDoubleClick={onDoubleClick}
      defaultFilters={defaultFilters()}
    />
    {selectedDistrictWagesheet && (
      <DistrictWagesheetDetailsDialog
        wagesheet={selectedDistrictWagesheet}
        onClose={() => setSelectedDistrictWagesheet(null)}
      />
    )}
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

export default connect(mapStateToProps, mapDispatchToProps)(PayrollSearcherPending);
