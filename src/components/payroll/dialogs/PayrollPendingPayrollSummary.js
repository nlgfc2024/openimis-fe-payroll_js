/* eslint-disable max-len */
import React, { useEffect, useState } from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {
  showPageFeedback,
  useModulesManager,
  useTranslations,
  waitForMutation,
} from '@openimis/fe-core';
import {
  Paper,
  Grid,
} from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  MODULE_NAME, BENEFIT_CONSUMPTION_STATUS, PAYROLL_STATUS, RIGHT_PAYROLL_CREATE,
} from '../../../constants';
import BenefitConsumptionSearcherModal from '../BenefitConsumptionSearcherModal';
import downloadPayroll from '../../../utils/export';
import { fetchPayroll, refreshWithdrawalFeeSnapshots } from '../../../actions';
import { formatAmountWithoutCurrency } from '../../../utils/payroll-utils';

function PaymentPendingPayrollPaymentDialog({
  classes,
  payroll,
  fetchPayroll,
  refreshWithdrawalFeeSnapshots,
  showPageFeedback,
  waitForMutation: waitForMutationStatus,
  payrollDetail,
  rights,
}) {
  const modulesManager = useModulesManager();
  const [payrollUuid] = useState(payrollDetail?.id ?? null);
  const [isOpen, setIsOpen] = useState(false);
  const [refreshingFees, setRefreshingFees] = useState(false);
  const [totalBeneficiaries, setTotalBeneficiaries] = useState(0);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState(0);
  const [totalBillAmount, setTotalBillAmount] = useState(0);
  const [totalReconciledBillAmount, setTotalReconciledBillAmount] = useState(0);

  const handleOpen = () => {
    if (payrollUuid) {
      fetchPayroll(modulesManager, [`id: "${payrollUuid}"`]);
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const formatAmount = (amount) => formatAmountWithoutCurrency(amount, modulesManager);
  const payrollBenefits = payroll?.id === payrollUuid ? payroll.benefitConsumption || [] : [];
  const feeIssues = payrollBenefits.filter((benefit) => benefit.withdrawalFeeError);
  const withdrawalFeeTotal = payrollBenefits.reduce(
    (total, benefit) => total + Number(benefit.withdrawalFee || 0),
    0,
  );
  const canRefreshFees = payrollDetail.payrollType === 'CONSOLIDATED'
    && payrollDetail.status === PAYROLL_STATUS.PENDING_APPROVAL
    && rights.includes(RIGHT_PAYROLL_CREATE)
    && feeIssues.length > 0;

  useEffect(() => {
    if (isOpen && payroll?.id === payrollUuid) {
      // Calculate total benefits and reconciled benefits
      const total = payroll.benefitConsumption.length;
      const selected = payroll.benefitConsumption.filter(
        (benefit) => benefit.status === BENEFIT_CONSUMPTION_STATUS.RECONCILED,
      ).length;

      setTotalBeneficiaries(total);
      setSelectedBeneficiaries(selected);

      let totalAmount = 0;
      let reconciledAmount = 0;
      if (payroll && payroll.benefitConsumption) {
        payroll.benefitConsumption.forEach((benefit) => {
          if (benefit.benefitAttachment && benefit.benefitAttachment.length > 0) {
            benefit.benefitAttachment.forEach((attachment) => {
              if (attachment.bill && attachment.bill.amountTotal) {
                totalAmount += parseFloat(attachment.bill.amountTotal);
                if (benefit.status === BENEFIT_CONSUMPTION_STATUS.RECONCILED) {
                  reconciledAmount += parseFloat(attachment.bill.amountTotal);
                }
              }
            });
          }
        });
      }
      setTotalBillAmount(totalAmount);
      setTotalReconciledBillAmount(reconciledAmount);
    }
  }, [isOpen, payroll]);

  const downloadPayrollData = (payrollUuid, payrollName) => {
    downloadPayroll(payrollUuid, payrollName);
  };

  const refreshFees = async () => {
    setRefreshingFees(true);
    try {
      const response = await refreshWithdrawalFeeSnapshots(
        payrollDetail,
        formatMessageWithValues('payroll.mutation.refreshWithdrawalFeesLabel', {
          payrollName: payrollDetail.name,
        }),
      );
      if (response?.error || response?.payload?.errors?.length) {
        throw new Error(
          response?.payload?.errors?.[0]?.message
            || formatMessage('payroll.consolidation.refreshFeesFailure.message'),
        );
      }
      const clientMutationId = response?.payload?.data?.refreshWithdrawalFeeSnapshots?.clientMutationId;
      if (!clientMutationId) {
        throw new Error(formatMessage('payroll.consolidation.refreshFeesFailure.message'));
      }
      const result = await waitForMutationStatus(clientMutationId);
      if (result?.status !== 2) {
        throw new Error(formatMessage('payroll.consolidation.refreshFeesFailure.message'));
      }

      await fetchPayroll(modulesManager, [`id: "${payrollUuid}"`]);
      showPageFeedback({
        severity: 'success',
        title: formatMessage('payroll.consolidation.refreshFeesSuccess.title'),
        message: formatMessage('payroll.consolidation.refreshFeesSuccess.message'),
      });
    } catch (error) {
      showPageFeedback({
        severity: 'error',
        title: formatMessage('payroll.consolidation.refreshFeesFailure.title'),
        message: error?.message || formatMessage('payroll.consolidation.refreshFeesFailure.message'),
      });
    } finally {
      setRefreshingFees(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="contained"
        color="primary"
        className={classes.button}
      >
        {formatMessage('payroll.viewReconciliationSummary')}
      </Button>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        PaperProps={{
          style: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '90%',
            maxWidth: '90%',
          },
        }}
      >
        <DialogTitle
          style={{
            marginTop: '10px',
          }}
        >
          {formatMessageWithValues('payroll.reconciliationSummary', { payrollName: payrollDetail.name })}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Paper elevation={3} style={{ padding: '20px' }}>
                <Typography variant="h6" gutterBottom>
                  {formatMessage('payroll.summary.selectedBeneficiaries')}
                </Typography>
                <Typography variant="body1">
                  {formatMessageWithValues('payroll.summary.beneficiariesCount', { selectedBeneficiaries, totalBeneficiaries })}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper elevation={3} style={{ padding: '20px' }}>
                <Typography variant="h6" gutterBottom>
                  {formatMessage('payroll.summary.totalAmountForInvoice')}
                </Typography>
                <Typography variant="body1">
                  {totalBillAmount}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper elevation={3} style={{ padding: '20px' }}>
                <Typography variant="h6" gutterBottom>
                  {formatMessage('payroll.summary.deliveredReconciliation')}
                </Typography>
                <Typography variant="body1">
                  {totalReconciledBillAmount}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper elevation={3} style={{ padding: '20px' }}>
                <Typography variant="h6" gutterBottom>
                  {formatMessage('payroll.consolidation.withdrawalFees')}
                </Typography>
                <Typography variant="body1">{formatAmount(withdrawalFeeTotal)}</Typography>
                {feeIssues.length > 0 && (
                  <Typography color="error">
                    {formatMessageWithValues('payroll.consolidation.unresolvedFeesCount', {
                      count: feeIssues.length,
                    })}
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
          <div
            style={{ backgroundColor: '#DFEDEF' }}
          >
            <BenefitConsumptionSearcherModal payrollUuid={payrollDetail.id} payrollDetail={payrollDetail} />
          </div>
        </DialogContent>
        <DialogActions
          style={{
            display: 'inline',
            paddingLeft: '10px',
            marginTop: '25px',
            marginBottom: '15px',
            width: '100%',
          }}
        >
          <div style={{ maxWidth: '3000px' }}>
            <div style={{ float: 'left' }}>
              {canRefreshFees && (
                <Button
                  onClick={refreshFees}
                  variant="contained"
                  color="primary"
                  disabled={refreshingFees}
                  style={{
                    margin: '0 16px',
                    marginBottom: '15px',
                  }}
                >
                  {formatMessage(refreshingFees
                    ? 'payroll.consolidation.refreshFees.loading'
                    : 'payroll.consolidation.refreshFees.button')}
                </Button>
              )}
              <Button
                onClick={() => downloadPayrollData(payrollDetail.id, payrollDetail.name)}
                variant="contained"
                color="primary"
                style={{
                  margin: '0 16px',
                  marginBottom: '15px',
                }}
              >
                {formatMessage('payroll.summary.download')}
              </Button>
            </div>
            <div style={{
              float: 'right',
              paddingRight: '16px',
            }}
            >
              <Button
                onClick={handleClose}
                variant="outlined"
                autoFocus
                style={{ margin: '0 16px' }}
              >
                {formatMessage('payroll.summary.close')}
              </Button>
            </div>
          </div>
        </DialogActions>
      </Dialog>
    </>
  );
}

const mapStateToProps = (state) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
  confirmed: state.core.confirmed,
  payroll: state.payroll.payroll,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchPayroll,
  refreshWithdrawalFeeSnapshots,
  showPageFeedback,
  waitForMutation,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PaymentPendingPayrollPaymentDialog);
