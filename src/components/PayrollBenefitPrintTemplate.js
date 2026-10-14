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

const PayrollBenefitPrintTemplate = forwardRef(({ benefitAttachments }, ref) => {
  if (!benefitAttachments) return null;
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(modulesManager, MODULE_NAME);

  return (
    <div ref={ref} className={classes.printContainer}>
      {benefitAttachments.map((benefitAttachment, index) => (
        <div key={index} className={classes.detailsContainer}>
          <div className={classes.sectionTitle}>
            {`Payment: ${benefitAttachment.benefit.code} - ${benefitAttachment.benefit.individual.firstName}, ${benefitAttachment.benefit.individual.lastName}`}
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.individual.firstName')}</div>
            <div className={classes.detailValue}>{benefitAttachment.benefit.individual.firstName}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.individual.lastName')}</div>
            <div className={classes.detailValue}>{benefitAttachment.benefit.individual.lastName}</div>
          </div>
          {[
            ['district', benefitAttachment.benefit.districtName],
            ['ta', benefitAttachment.benefit.traditionalAuthorityName],
            ['gvh', benefitAttachment.benefit.groupVillageHeadName],
            ['catchment', benefitAttachment.benefit.catchmentName],
            ['projectName', benefitAttachment.benefit.projectName],
            ['formNumber', benefitAttachment.benefit.formNumber],
          ].map(([field, value]) => (
            <div key={field} className={classes.detailRow}>
              <div className={classes.detailName}>{formatMessage(`payroll.benefitConsumption.${field}`)}</div>
              <div className={classes.detailValue}>{value || ''}</div>
            </div>
          ))}
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.dateDue')}</div>
            <div className={classes.detailValue}>{benefitAttachment.benefit.dateDue}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.receipt')}</div>
            <div className={classes.detailValue}>{benefitAttachment.benefit.receipt}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.amount')}</div>
            <div className={classes.detailValue}>{benefitAttachment.benefit.amount}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.type')}</div>
            <div className={classes.detailValue}>{benefitAttachment.benefit.type}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.status')}</div>
            <div className={classes.detailValue}>{benefitAttachment.benefit.status}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.payedOnTime')}</div>
            <div className={classes.detailValue}>{benefitAttachment.benefit.payedOnTime ? 'Yes' : 'No'}</div>
          </div>
          <div className={classes.detailRow}>
            <div className={classes.detailName}>{formatMessage('payroll.benefitConsumption.paymentDate')}</div>
            <div className={classes.detailValue}>
              {!benefitAttachment.benefit.receipt
                ? ''
                : benefitAttachment?.bill?.datePayed}
            </div>
          </div>
          <Divider className={classes.dividerMargin} />
        </div>
      ))}
    </div>
  );
});

export default PayrollBenefitPrintTemplate;
