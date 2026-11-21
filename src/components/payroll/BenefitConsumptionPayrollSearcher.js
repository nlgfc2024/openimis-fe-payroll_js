/* eslint-disable no-param-reassign */
import React, { useEffect, useState } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import {
  Searcher, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import {
  Paper,
  Grid,
} from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import { fetchPayrollBenefitConsumptions, fetchBenefitsSummary } from '../../actions';
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
} from '../../constants';
import BenefitConsumptionPayrollFilter from './BenefitConsumptionPayrollFilter';

function BenefitConsumptionPayrollSearcher({
  fetchPayrollBenefitConsumptions,
  fetchingPayrollBenefitConsumptions,
  fetchedPayrollBenefitConsumptions,
  errorPayrollBenefitConsumptions,
  payrollBenefitConsumptions,
  payrollBenefitConsumptionsPageInfo,
  payrollBenefitConsumptionsTotalCount,
  fetchBenefitsSummary,
  fetchedBenefitsSummary,
  benefitsSummary,
  individualUuid,
  benefitPlan,
  groupBeneficiaries,
  paymentCycleUuid,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues, formatAmount } = useTranslations('payroll', modulesManager);
  const [totalNumberOfBenefits, setTotalNumberOfBenefits] = useState(0);

  const fetch = (params) => fetchPayrollBenefitConsumptions(modulesManager, params);

  const headers = () => [
    'benefitConsumption.payroll.name',
    'benefitConsumption.payroll.benefitPlan',
    'benefitConsumption.payroll.startDate',
    'benefitConsumption.payroll.endDate',
    'benefitConsumption.individual.firstName',
    'benefitConsumption.individual.lastName',
    'benefitConsumption.gender',
    'benefitConsumption.accountNumber',
    'benefitConsumption.accountName',
    'benefitConsumption.bank',
    'benefitConsumption.status',
    'benefitConsumption.code',
    'benefitConsumption.receipt',
    'benefitConsumption.dateDue',
    'benefitConsumption.amount',
    'benefitConsumption.withdrawalFee',
    'benefitConsumption.amountToPay',
    'benefitConsumption.type',
    'benefitConsumption.payedOnTime',
    'benefitConsumption.paymentDate',
  ];

  const checkBenefitDueDate = (payrollBenefitConsumption) => {
    if (!payrollBenefitConsumption.benefit.hasReceipt) {
      return ''; // return empty string if datePayed is null
    }

    return (
      payrollBenefitConsumption.benefit
      && payrollBenefitConsumption.benefit.dateDue
      >= payrollBenefitConsumption.benefit.benefitAttachment[0].bill.datePayed)
      ? 'True' : 'False';
  };

  const formatWithdrawalFee = (payrollBenefitConsumption) => {
    const benefit = payrollBenefitConsumption?.benefit;
    if (benefit?.withdrawalFee != null) return formatAmount(benefit.withdrawalFee);
    if (!benefit?.withdrawalFeeError) return '';
    return (
      <span title={benefit.withdrawalFeeError}>
        {formatMessage('payroll.benefitConsumption.withdrawalFeeUnavailable')}
      </span>
    );
  };

  const itemFormatters = () => [
    (payrollBenefitConsumption) => payrollBenefitConsumption?.payroll?.name,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.payroll?.benefitPlanNameCode,
    // eslint-disable-next-line max-len
    (payrollBenefitConsumption) => payrollBenefitConsumption?.payroll?.paymentCycle?.startDate,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.payroll?.paymentCycle?.endDate,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.individual?.firstName,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.individual?.lastName,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.gender,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.accountNumber,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.accountName,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.bank,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.status,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.code,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.receipt,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.dateDue,
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.amount,
    formatWithdrawalFee,
    (payrollBenefitConsumption) => (payrollBenefitConsumption?.benefit?.amountToPay != null
      ? formatAmount(payrollBenefitConsumption.benefit.amountToPay)
      : ''),
    (payrollBenefitConsumption) => payrollBenefitConsumption?.benefit?.type,
    (payrollBenefitConsumption) => checkBenefitDueDate(payrollBenefitConsumption),
    (payrollBenefitConsumption) => (
      !payrollBenefitConsumption.benefit.hasReceipt
        ? ''
        : payrollBenefitConsumption?.benefit?.benefitAttachment[0]?.bill?.datePayed
    ),
  ];

  const rowIdentifier = (benefitConsumption) => benefitConsumption.id;

  const sorts = () => [
    ['payroll_Name', true],
    ['payroll_benefitPlanName', false],
    ['payroll_PaymentCycle_StartDate', true],
    ['payroll_PaymentCycle_EndDate', true],
    null,
    null,
    null,
    null,
    null,
    null,
    ['benefit_Status', true],
    ['benefit_Code', true],
    ['benefit_Receipt', true],
    ['benefit_DateDue', true],
    ['benefit_Amount', true],
    null,
    null,
    ['benefit_Type', true],
    null,
    null,
  ];

  const defaultFilters = () => {
    const filters = {
      isDeleted: {
        value: false,
        filter:
        'isDeleted: false',
      },
    };
    if (groupBeneficiaries !== null && groupBeneficiaries !== undefined) {
      filters.benefit_Individual_Id = {
        value: groupBeneficiaries?.group?.head?.uuid,
        filter: `benefit_Individual_Id: "${groupBeneficiaries?.group?.head?.uuid}"`,
      };
    } else if (individualUuid !== null && individualUuid !== undefined) {
      filters.benefit_Individual_Id = {
        value: individualUuid,
        filter: `benefit_Individual_Id: "${individualUuid}"`,
      };
    }
    if (benefitPlan?.id) {
      filters.benefitPlanUuid = {
        value: benefitPlan.id,
        filter: `benefitPlanUuid: "${benefitPlan.id}"`,
      };
    }
    if (paymentCycleUuid) {
      filters.paymentCycleUuid = {
        value: paymentCycleUuid,
        filter: `paymentCycleUuid: "${paymentCycleUuid}"`,
      };
    }
    return filters;
  };

  useEffect(() => {
    const params = [];
    if (individualUuid) {
      params.push(
        `individualId: "${individualUuid}"`,
      );
    }
    if (groupBeneficiaries) {
      params.push(
        `individualId: "${groupBeneficiaries?.group?.head?.uuid}"`,
      );
    }
    if (benefitPlan?.id) {
      params.push(
        `benefitPlanUuid: "${benefitPlan.id}"`,
      );
    }
    if (paymentCycleUuid) {
      params.push(
        `paymentCycleUuid: "${paymentCycleUuid}"`,
      );
    }
    fetchBenefitsSummary(params);
  }, []);

  useEffect(() => {
    if (payrollBenefitConsumptionsTotalCount > totalNumberOfBenefits) {
      setTotalNumberOfBenefits(payrollBenefitConsumptionsTotalCount);
    }
  }, [payrollBenefitConsumptionsTotalCount]);

  const benefitConsumptionPayrollFilter = ({ filters, onChangeFilters }) => (
    <BenefitConsumptionPayrollFilter
      filters={filters}
      onChangeFilters={onChangeFilters}
      benefitPlan={benefitPlan}
    />
  );

  return (
    <div>
      {fetchedBenefitsSummary && (
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Paper elevation={3} style={{ padding: '20px' }}>
            <Typography variant="h6" gutterBottom>
              {formatMessage('payroll.summary.totalNumberOfBenefits')}
            </Typography>
            <Typography variant="body1">
              {totalNumberOfBenefits}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={3} style={{ padding: '20px' }}>
            <Typography variant="h6" gutterBottom>
              {formatMessage('payroll.summary.totalAmountDue')}
            </Typography>
            <Typography variant="body1">
              {benefitsSummary?.totalAmountDue ?? 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={3} style={{ padding: '20px' }}>
            <Typography variant="h6" gutterBottom>
              {formatMessage('payroll.summary.totalAmountReceived')}
            </Typography>
            <Typography variant="body1">
              {benefitsSummary?.totalAmountReceived ?? 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      )}
      <Searcher
        module="payroll"
        FilterPane={benefitConsumptionPayrollFilter}
        fetch={fetch}
        items={payrollBenefitConsumptions}
        itemsPageInfo={payrollBenefitConsumptionsPageInfo}
        fetchingItems={fetchingPayrollBenefitConsumptions}
        fetchedItems={fetchedPayrollBenefitConsumptions}
        errorItems={errorPayrollBenefitConsumptions}
        tableTitle={
          // eslint-disable-next-line max-len
          formatMessageWithValues('payrollBenefitConsumption.searcherResultsTitle', { payrollBenefitConsumptionsTotalCount })
        }
        headers={headers}
        itemFormatters={itemFormatters}
        sorts={sorts}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        rowIdentifier={rowIdentifier}
        defaultFilters={defaultFilters()}
      />
    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingPayrollBenefitConsumptions: state.payroll.fetchingPayrollBenefitConsumptions,
  fetchedPayrollBenefitConsumptions: state.payroll.fetchedPayrollBenefitConsumptions,
  errorPayrollBenefitConsumptions: state.payroll.errorPayrollBenefitConsumptions,
  payrollBenefitConsumptions: state.payroll.payrollBenefitConsumptions,
  payrollBenefitConsumptionsPageInfo: state.payroll.payrollBenefitConsumptionsPageInfo,
  payrollBenefitConsumptionsTotalCount: state.payroll.payrollBenefitConsumptionsTotalCount,
  fetchingBenefitsSummary: state.payroll.fetchingBenefitsSummary,
  errorBenefitsSummary: state.payroll.errorBenefitsSummary,
  fetchedBenefitsSummary: state.payroll.fetchedBenefitsSummary,
  benefitsSummary: state.payroll.benefitsSummary,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  { fetchPayrollBenefitConsumptions, fetchBenefitsSummary },
  dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(BenefitConsumptionPayrollSearcher);
