import React, { useEffect, useMemo } from 'react';
import {
  CircularProgress,
  Grid,
  makeStyles,
  Paper,
  Typography,
} from '@material-ui/core';
import {
  useGraphqlQuery,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import { MODULE_NAME } from '../../constants';

const useStyles = makeStyles((theme) => ({
  panel: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
  },
  ready: {
    color: theme.palette.success.main,
  },
  blocked: {
    color: theme.palette.error.main,
  },
  metric: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
}));

const ISSUE_LABELS = {
  account_name: 'payroll.kyc.readiness.issue.accountName',
  account_number: 'payroll.kyc.readiness.issue.accountNumber',
  ambiguous_primary_recipient: 'payroll.kyc.readiness.issue.ambiguousPrimaryRecipient',
  bank: 'payroll.kyc.readiness.issue.bank',
  group_beneficiary_not_found: 'payroll.kyc.readiness.issue.groupBeneficiaryNotFound',
  household_not_verified: 'payroll.kyc.readiness.issue.householdNotVerified',
  invalid_account_number: 'payroll.kyc.readiness.issue.invalidAccountNumber',
  missing_benefit_amount: 'payroll.kyc.readiness.issue.missingBenefitAmount',
  missing_primary_recipient: 'payroll.kyc.readiness.issue.missingPrimaryRecipient',
  no_matching_fee_band: 'payroll.kyc.readiness.issue.noMatchingFeeBand',
  provider_not_configured_or_inactive: 'payroll.kyc.readiness.issue.providerNotConfigured',
  recipient_is_no_longer_primary: 'payroll.kyc.readiness.issue.recipientIsNoLongerPrimary',
};

const parseReadiness = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const formatMwk = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MWK`
    : '—';
};

export default function KycPaymentReadinessPanel({ payrollUuid, onReadinessChange }) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const { data, error, isLoading } = useGraphqlQuery(
    `query PayrollKycPaymentReadiness($id: ID!) {
      payroll(id: $id) {
        edges {
          node {
            kycPaymentReadiness
          }
        }
      }
    }`,
    { id: payrollUuid },
    { skip: !payrollUuid },
  );
  const rawReadiness = data?.payroll?.edges?.[0]?.node?.kycPaymentReadiness;
  const readiness = useMemo(() => parseReadiness(rawReadiness), [rawReadiness]);

  useEffect(() => {
    onReadinessChange?.(readiness);
  }, [onReadinessChange, readiness]);

  const formatIssue = (issue) => formatMessage(
    ISSUE_LABELS[issue] || 'payroll.kyc.readiness.issue.unknown',
  );

  return (
    <Paper className={classes.panel} elevation={1}>
      <Typography variant="h6">
        {formatMessage('payroll.kyc.readiness.title')}
      </Typography>
      {isLoading && (
        <Grid container spacing={1} alignItems="center">
          <Grid item><CircularProgress size={18} /></Grid>
          <Grid item>
            <Typography variant="body2">
              {formatMessage('payroll.kyc.readiness.loading')}
            </Typography>
          </Grid>
        </Grid>
      )}
      {!isLoading && error && (
        <Typography color="error" role="alert">
          {formatMessage('payroll.kyc.readiness.loadError')}
        </Typography>
      )}
      {!isLoading && !error && !readiness && (
        <Typography color="error" role="alert">
          {formatMessage('payroll.kyc.readiness.invalidResponse')}
        </Typography>
      )}
      {!isLoading && !error && readiness && (
        <>
          <Typography className={readiness.ready_for_payment ? classes.ready : classes.blocked}>
            {formatMessage(
              readiness.ready_for_payment
                ? 'payroll.kyc.readiness.ready'
                : 'payroll.kyc.readiness.blocked',
            )}
          </Typography>
          <Grid container spacing={1}>
            {[
              ['payroll.kyc.readiness.eligibleBenefits', readiness.eligible_benefits],
              ['payroll.kyc.readiness.usableDetails', readiness.benefits_with_usable_approved_payment_details],
              ['payroll.kyc.readiness.missingDetails', readiness.missing_payment_details],
              ['payroll.kyc.readiness.pendingApproval', readiness.payment_detail_update_pending_approval],
              ['payroll.kyc.readiness.rejectedOrUnusable', readiness.rejected_or_unusable_payment_details],
            ].map(([label, value]) => (
              <Grid item xs={6} md={4} key={label} className={classes.metric}>
                <Typography variant="caption">{formatMessage(label)}</Typography>
                <Typography variant="h6">{value ?? 0}</Typography>
              </Grid>
            ))}
          </Grid>
          <Typography variant="subtitle2">
            {formatMessage('payroll.kyc.readiness.readyBenefitTotals')}
          </Typography>
          <Typography variant="body2">
            {formatMessageWithValues('payroll.kyc.readiness.cashOutFeeTotal', {
              amount: formatMwk(readiness.ready_benefits_cash_out_fee_total),
            })}
          </Typography>
          <Typography variant="body2">
            {formatMessageWithValues('payroll.kyc.readiness.programmeTotalCost', {
              amount: formatMwk(readiness.ready_benefits_programme_total_cost),
            })}
          </Typography>
          {!readiness.ready_for_payment && (
            <div role="alert">
              <Typography variant="subtitle2">
                {formatMessage('payroll.kyc.readiness.blockingBenefits')}
              </Typography>
              {(readiness.blocked_benefits || []).slice(0, 10).map((benefit) => (
                <Typography variant="body2" key={benefit.benefit_code}>
                  {benefit.benefit_code}
                  {`: ${(benefit.issues || []).map(formatIssue).join(', ')}`}
                </Typography>
              ))}
              {(readiness.blocked_benefits || []).length > 10 && (
                <Typography variant="body2">
                  {formatMessageWithValues('payroll.kyc.readiness.moreBlocked', {
                    count: readiness.blocked_benefits.length - 10,
                  })}
                </Typography>
              )}
            </div>
          )}
        </>
      )}
    </Paper>
  );
}
