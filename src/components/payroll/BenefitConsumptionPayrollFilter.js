import React from 'react';
import _debounce from 'lodash/debounce';

import { Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

import {
  PublishedComponent,
  useModulesManager,
  useTranslations,
  TextInput,
  NumberInput,
} from '@openimis/fe-core';
import { CONTAINS_LOOKUP, DEFAULT_DEBOUNCE_TIME, EMPTY_STRING } from '../../constants';
import BenefitConsumptionStatusPicker from '../../pickers/BenefitConsumptionStatusPicker';

const useStyles = makeStyles((theme) => ({
  form: {
    padding: 0,
  },
  item: {
    padding: theme.spacing(1),
  },
}));

function BenefitConsumptionPayrollFilter({ filters, onChangeFilters, benefitPlan }) {
  const modulesManager = useModulesManager();
  const classes = useStyles();
  const { formatMessage } = useTranslations('payroll', modulesManager);

  const debouncedOnChangeFilters = _debounce(onChangeFilters, DEFAULT_DEBOUNCE_TIME);

  const filterTextFieldValue = (filterName) => filters?.[filterName]?.value ?? EMPTY_STRING;

  const filterValue = (filterName) => filters?.[filterName]?.value ?? null;

  const onChangeStringFilter = (filterName, lookup = null) => (value) => {
    if (lookup) {
      debouncedOnChangeFilters([
        {
          id: filterName,
          value,
          filter: `${filterName}_${lookup}: "${value}"`,
        },
      ]);
    } else {
      debouncedOnChangeFilters([
        {
          id: filterName,
          value,
          filter: `${filterName}: "${value}"`,
        },
      ]);
    }
  };

  return (
    <Grid container className={classes.form}>
      <Grid item xs={2} className={classes.item}>
        <TextInput
          module="payroll"
          label="benefitConsumption.payroll.name"
          value={filterTextFieldValue('payroll_Name')}
          onChange={onChangeStringFilter('payroll_Name', CONTAINS_LOOKUP)}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <TextInput
          module="payroll"
          label="benefitConsumption.payroll.benefitPlan"
          value={filterTextFieldValue('benefitPlanName')}
          onChange={onChangeStringFilter('benefitPlanName')}
          readOnly={benefitPlan !== null && benefitPlan !== undefined}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <PublishedComponent
          pubRef="core.DatePicker"
          module="payroll"
          label={formatMessage('benefitConsumption.payroll.startDate')}
          value={filterValue('payroll_PaymentCycle_StartDate')}
          onChange={(v) => onChangeFilters([
            {
              id: 'payroll_PaymentCycle_StartDate',
              value: v,
              filter: `payroll_PaymentCycle_StartDate: "${v}"`,
            },
          ])}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <PublishedComponent
          pubRef="core.DatePicker"
          module="payroll"
          label={formatMessage('benefitConsumption.payroll.endDate')}
          value={filterValue('payroll_PaymentCycle_EndDate')}
          onChange={(v) => onChangeFilters([
            {
              id: 'payroll_PaymentCycle_EndDate',
              value: v,
              filter: `payroll_PaymentCycle_EndDate: "${v}"`,
            },
          ])}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <BenefitConsumptionStatusPicker
          module="payroll"
          label={formatMessage('benefitConsumptions.status.label')}
          withNull
          nullLabel={formatMessage('tooltip.any')}
          value={filterValue('benefit_Status')}
          onChange={(value) => onChangeFilters([
            {
              id: 'benefit_Status',
              value,
              filter: `benefit_Status: ${value}`,
            },
          ])}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <TextInput
          module="payroll"
          label="benefitConsumption.code"
          value={filterTextFieldValue('benefit_Code')}
          onChange={onChangeStringFilter('benefit_Code', CONTAINS_LOOKUP)}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <TextInput
          module="payroll"
          label="benefitConsumption.receipt"
          value={filterTextFieldValue('benefit_Receipt')}
          onChange={onChangeStringFilter('benefit_Receipt', CONTAINS_LOOKUP)}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <PublishedComponent
          pubRef="core.DatePicker"
          module="payroll"
          label={formatMessage('benefitConsumption.dateDue')}
          value={filterValue('benefit_DateDue')}
          onChange={(v) => onChangeFilters([
            {
              id: 'benefit_DateDue',
              value: v,
              filter: `benefit_DateDue: "${v}"`,
            },
          ])}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <NumberInput
          module="payroll"
          label={formatMessage('benefitConsumption.amount')}
          min={0}
          value={filterValue('benefit_Amount')}
          onChange={onChangeStringFilter('benefit_Amount')}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <TextInput
          module="payroll"
          label="benefitConsumption.type"
          value={filterTextFieldValue('benefit_Type')}
          onChange={onChangeStringFilter('benefit_Type', CONTAINS_LOOKUP)}
        />
      </Grid>
    </Grid>
  );
}

export default BenefitConsumptionPayrollFilter;
