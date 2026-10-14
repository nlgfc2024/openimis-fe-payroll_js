/* eslint-disable max-len */
/* eslint-disable react/no-array-index-key */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-undef */
import React, {
  forwardRef,
} from 'react';

import { Divider } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

import {
  useTranslations, useModulesManager,
} from '@openimis/fe-core';
import { MODULE_NAME } from '../constants';

const useStyles = makeStyles(() => ({
  topHeader: {
    display: 'flex',
    justifyContent: 'start',
    alignItems: 'center',
    width: '100%',

    '& img': {
      minWidth: '250px',
      maxWidth: '300px',
      width: 'auto',
      height: 'auto',
    },
  },
  printContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontWeight: '500',
  },
  date: {
    fontSize: '16px',
  },
  detailsContainer: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px',
    width: '100%',
  },
  detailRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px',
  },
  detailName: {
    fontWeight: '600',
    fontSize: '16px',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontWeight: '500',
    backgroundColor: '#f5f5f5',
    padding: '6px',
    borderRadius: '8px',
    fontSize: '15px',
  },
  containerPadding: {
    padding: '32px',
  },
  dividerMargin: {
    margin: '12px 0',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: '18px',
    textTransform: 'uppercase',
    marginBottom: '12px',
  },
}));

const PayrollPrintTemplate = forwardRef(({ benefitConsumptions }, ref) => {
  if (!benefitConsumptions) return null;
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(modulesManager, MODULE_NAME);

  return (
    <div ref={ref} className={classes.printContainer}>
      {benefitConsumptions.map((benefitConsumption, index) => (
        <div key={index} className={classes.detailsContainer}>
          <div className={classes.sectionTitle}>
            {`Payment: ${benefitConsumption.code} - ${benefitConsumption.individual.firstName}, ${benefitConsumption.individual.lastName}`}
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.individual.firstName')}</div>
            <div className={classes.detailValue}>{benefitConsumption.individual.firstName}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.individual.lastName')}</div>
            <div className={classes.detailValue}>{benefitConsumption.individual.lastName}</div>
          </div>
          {[
            ['district', benefitConsumption.districtName],
            ['ta', benefitConsumption.traditionalAuthorityName],
            ['gvh', benefitConsumption.groupVillageHeadName],
            ['catchment', benefitConsumption.catchmentName],
            ['projectName', benefitConsumption.projectName],
            ['formNumber', benefitConsumption.formNumber],
          ].map(([field, value]) => (
            <div key={field} className={classes.detailRow}>
              <div className={classes.detailName}>{formatMessage(`payroll.benefitConsumption.${field}`)}</div>
              <div className={classes.detailValue}>{value || ''}</div>
            </div>
          ))}
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.dateDue')}</div>
            <div className={classes.detailValue}>{benefitConsumption.dateDue}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.receipt')}</div>
            <div className={classes.detailValue}>{benefitConsumption.receipt}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.amount')}</div>
            <div className={classes.detailValue}>{benefitConsumption.amount}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.type')}</div>
            <div className={classes.detailValue}>{benefitConsumption.type}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.status')}</div>
            <div className={classes.detailValue}>{benefitConsumption.status}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.paymentDate')}</div>
            <div className={classes.detailValue}>
              {!benefitConsumption.receipt
                ? ''
                : benefitConsumption?.benefitAttachment[0]?.bill?.datePayed}
            </div>
          </div>
          <Divider className={classes.dividerMargin} />
        </div>
      ))}
    </div>
  );
});

export default PayrollPrintTemplate;
