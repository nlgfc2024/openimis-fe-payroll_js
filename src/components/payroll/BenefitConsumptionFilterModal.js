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

const useStyles = makeStyles((theme) => ({
  form: {
    padding: 0,
  },
  item: {
    padding: theme.spacing(1),
  },
}));

function BenefitConsumptionFilterModal({ filters, onChangeFilters }) {
  const modulesManager = useModulesManager();
  const classes = useStyles();
  const { formatMessage } = useTranslations('payroll', modulesManager);

  const debouncedOnChangeFilters = _debounce(onChangeFilters, DEFAULT_DEBOUNCE_TIME);

  const filterTextFieldValue = (filterName) => filters?.[filterName]?.value ?? EMPTY_STRING;

  const filterValue = (filterName) => filters?.[filterName]?.value ?? null;

  const onChangeFilter = (filterName) => (value) => {
    debouncedOnChangeFilters([
      {
        id: filterName,
        value: value || null,
        filter: `${filterName}: ${value}`,
      },
    ]);
  };

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
          label="benefitConsumption.individual.firstName"
          value={filterTextFieldValue('benefit_Individual_FirstName')}
          onChange={onChangeStringFilter('benefit_Individual_FirstName', CONTAINS_LOOKUP)}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <TextInput
          module="payroll"
          label="benefitConsumption.individual.lastName"
          value={filterTextFieldValue('benefit_Individual_LastName')}
          onChange={onChangeStringFilter('benefit_Individual_LastName', CONTAINS_LOOKUP)}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <NumberInput
          module="payroll"
          label={formatMessage('benefitConsumption.amount')}
          min={0}
          value={filterValue('bill_AmountTotal')}
          onChange={onChangeFilter('bill_AmountTotal')}
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
        <PublishedComponent
          pubRef="core.DatePicker"
          module="payroll"
          label={formatMessage('benefitConsumption.paymentDate')}
          value={filterValue('bill_DatePayed_Gte')}
          onChange={(v) => onChangeFilters([
            {
              id: 'bill_DatePayed_Gte',
              value: v,
              filter: `bill_DatePayed_Gte: "${v}"`,
            },
          ])}
        />
      </Grid>
    </Grid>
  );
}

export default BenefitConsumptionFilterModal;
