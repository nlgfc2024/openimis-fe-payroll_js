import React, { useState } from 'react';
import { Input, Grid } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {
  apiHeaders,
  baseApiUrl,
  FeedbackBanner,
  LoadingOverlay,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import downloadPayroll from '../../../utils/export';

const styles = (theme) => ({
  item: theme.paper.item,
  dialogPaper: {
    width: 800,
    maxWidth: 900,
  },
  resultTitle: {
    fontWeight: 'bold',
    margin: theme.spacing(1, 0),
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing(0.5, 0),
  },
  issueMetrics: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  issueMetric: {
    border: `1px solid ${theme.palette.error.light}`,
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.75rem',
    padding: theme.spacing(0.25, 0.75),
  },
});

function PayrollPaymentDataUploadDialog({
  classes,
  payrollUuid,
  onUploadResult,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations('payroll', modulesManager);
  const [isOpen, setIsOpen] = useState(false);
  const [forms, setForms] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setForms({});
    setFeedback(null);
    setIsOpen(false);
  };

  const handleFieldChange = (formName, fieldName, value) => {
    setForms({
      ...forms,
      [formName]: {
        ...(forms[formName] ?? {}),
        [fieldName]: value,
      },
    });
  };

  const onSubmit = async (values) => {
    const file = values?.file;
    if (!file) return;
    const fileFormat = file.type;
    if (!file.name.toLowerCase().endsWith('.xlsx')
      && fileFormat !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setFeedback({ severity: 'error', message: formatMessage('payroll.reconciliationUpload.invalidFile') });
      return;
    }
    const formData = new FormData();

    formData.append('file', file);
    const urlImport = `${baseApiUrl}/payroll/csv_reconciliation/?payroll_id=${payrollUuid}`;

    try {
      setIsUploading(true);
      setFeedback(null);
      const headers = new Headers(apiHeaders());
      headers.delete('Content-Type');
      const response = await fetch(urlImport, {
        headers,
        body: formData,
        method: 'POST',
        credentials: 'same-origin',
      });

      const payload = await response.json();
      const summary = payload.summary || {};
      const error = payload.error || {};
      const status = payload.status || 'FAIL';
      const errorMessage = typeof error === 'string' ? error : (error.message || error.code);
      const summaryMessage = formatMessageWithValues('payroll.reconciliationUpload.statusSummary', {
        status: status.replaceAll('_', ' ').toLowerCase(),
        total: summary.total_records || 0,
        matched: summary.matched_records || 0,
        paid: summary.paid_records || 0,
        unpaid: summary.unpaid_records || 0,
        unmatched: summary.unmatched_records || 0,
      });
      const message = response.ok
        ? summaryMessage
        : (errorMessage || formatMessage('payroll.reconciliationUpload.processingFailed'));
      setFeedback({
        severity: response.ok && status !== 'DUPLICATE' ? 'success' : 'error',
        message,
        uploadId: payload.upload_id,
        fileName: file.name,
        status,
        summary,
      });
      if (response.ok && onUploadResult) onUploadResult(payload);
    } catch (error) {
      const message = formatMessage('payroll.reconciliationUpload.networkFailed');
      setFeedback({ severity: 'error', message });
    } finally {
      setIsUploading(false);
    }
  };

  // Some validation and network failures intentionally have no upload summary.
  // Keep the dialog renderable for those responses as well as normal uploads.
  const feedbackSummary = feedback?.summary || {};
  const unmatchedRecords = Number(feedbackSummary.unmatched_records || 0);
  const hasValidationIssues = unmatchedRecords > 0;
  const isDuplicate = feedback?.status === 'DUPLICATE';
  const isSuccessful = feedback?.severity === 'success' && !hasValidationIssues;

  const feedbackTitle = () => {
    if (isDuplicate) return formatMessage('payroll.reconciliationUpload.title.duplicate');
    if (hasValidationIssues) return formatMessage('payroll.reconciliationUpload.title.unmatched');
    if (isSuccessful) return formatMessage('payroll.reconciliationUpload.title.complete');
    return formatMessage('payroll.reconciliationUpload.title.attention');
  };

  const feedbackSeverity = () => {
    if (isDuplicate) return 'warning';
    if (isSuccessful) return 'success';
    return 'error';
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outlined"
        color="#DFEDEF"
        className={classes.button}
        style={{
          border: '0px',
          marginTop: '6px',
        }}
      >
        {formatMessage('payroll.paymentData.upload.label')}
      </Button>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        classes={{ paper: classes.dialogPaper }}
      >
        <form noValidate>
          <DialogTitle
            style={{
              marginTop: '10px',
            }}
          >
            {formatMessage('payroll.paymentData.upload.label')}
          </DialogTitle>
          <DialogContent>
            {feedback && (
              <div className={classes.item}>
                <FeedbackBanner severity={feedbackSeverity()} title={feedbackTitle()}>
                  {hasValidationIssues && (
                    <>
                      {formatMessage('payroll.reconciliationUpload.message.unmatched')}
                      <div className={classes.issueMetrics}>
                        <span className={classes.issueMetric}>
                          {formatMessageWithValues('payroll.reconciliationUpload.metric.unmatched', { count: unmatchedRecords })}
                        </span>
                      </div>
                    </>
                  )}
                  {isDuplicate && formatMessage('payroll.reconciliationUpload.message.duplicate')}
                  {isSuccessful && (feedback.status === 'WAITING_FOR_VERIFICATION'
                    ? formatMessage('payroll.reconciliationUpload.message.readyForReview')
                    : feedback.message)}
                  {!hasValidationIssues && !isDuplicate && !isSuccessful && feedback.message}
                </FeedbackBanner>
                <div className={classes.resultTitle}>{formatMessage('payroll.reconciliationUpload.summary.title')}</div>
                {[
                  [formatMessage('payroll.reconciliationUpload.summary.totalRecords'), feedbackSummary.total_records],
                  [formatMessage('payroll.reconciliationUpload.summary.matchedRecords'), feedbackSummary.matched_records],
                  [formatMessage('payroll.reconciliationUpload.summary.paidRecords'), feedbackSummary.paid_records],
                  [formatMessage('payroll.reconciliationUpload.summary.unpaidRecords'), feedbackSummary.unpaid_records],
                  [formatMessage('payroll.reconciliationUpload.summary.unmatchedRecords'), feedbackSummary.unmatched_records],
                ].map(([label, value]) => (
                  <div key={label} className={classes.resultRow}>
                    <span>{label}</span><span>{value || 0}</span>
                  </div>
                ))}
              </div>
            )}
            <div
              style={{ backgroundColor: '#DFEDEF', paddingLeft: '10px', paddingBottom: '10px' }}
            >
              <Grid item>
                <Grid container spacing={4} direction="column">
                  <Grid item>
                    <Input
                      onChange={(event) => handleFieldChange('paymentData', 'file', event.target.files[0])}
                      required
                      id="import-button"
                      inputProps={{
                        accept: '.xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                      }}
                      type="file"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </div>
          </DialogContent>
          <DialogActions
            style={{
              display: 'inline',
              paddingLeft: '10px',
              marginTop: '25px',
              marginBottom: '15px',
            }}
          >
            <div style={{ maxWidth: '1000px' }}>
              <div style={{ float: 'left' }}>
                <Button
                  onClick={handleClose}
                  variant="outlined"
                  autoFocus
                  style={{
                    margin: '0 16px',
                    marginBottom: '15px',
                  }}
                >
                  {feedback ? formatMessage('payroll.summary.close') : formatMessage('payroll.advancedFilters.button.cancel')}
                </Button>
              </div>
              <div style={{ float: 'right', paddingRight: '16px' }}>
                {feedback?.uploadId ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => downloadPayroll(payrollUuid, feedback.fileName, false, feedback.uploadId)}
                  >
                    {feedbackSummary.unmatched_records > 0 || feedback.severity === 'error'
                      ? formatMessage('payroll.reconciliationUpload.downloadErrorReport')
                      : formatMessage('payroll.reconciliationUpload.downloadReviewedFile')}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => onSubmit(forms.paymentData)}
                    disabled={isUploading || !(forms.paymentData?.file && payrollUuid)}
                  >
                    {isUploading ? formatMessage('payroll.reconciliationUpload.uploading') : formatMessage('payroll.paymentData.upload.label')}
                  </Button>
                )}
              </div>
            </div>
          </DialogActions>
        </form>
      </Dialog>
      <LoadingOverlay open={isUploading} label={formatMessage('payroll.reconciliationUpload.loading')} />
    </>
  );
}

const mapStateToProps = (state) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
  confirmed: state.core.confirmed,
});

export default withTheme(
  withStyles(styles)(
    connect(mapStateToProps)(PayrollPaymentDataUploadDialog),
  ),
);
