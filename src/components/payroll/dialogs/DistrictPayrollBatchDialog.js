import React, { useEffect, useState } from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {
  FormControl, Grid, Input, InputLabel, MenuItem, Select, Typography,
} from '@material-ui/core';
import {
  baseApiUrl,
  apiHeaders,
  decodeId,
  FeedbackBanner,
  PublishedComponent,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import { MODULE_NAME } from '../../../constants';

function DistrictPayrollBatchDialog({ open, onClose, onCreated, mode = 'download' }) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [district, setDistrict] = useState(null);
  const [benefitPlan, setBenefitPlan] = useState(null);
  const [financialYears, setFinancialYears] = useState([]);
  const [financialYear, setFinancialYear] = useState('');
  const [file, setFile] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const canSubmit = district && benefitPlan && financialYear;
  const hasUploadIssues = feedback?.upload_id && (
    feedback.severity === 'error'
    || feedback.status === 'DUPLICATE'
    || Number(feedback.summary?.unmatched_records || 0) > 0
  );

  const errorMessage = (error, fallback) => {
    if (typeof error === 'string') return error;
    if (typeof error?.message === 'string') return error.message;
    if (error && typeof error === 'object') {
      return Object.values(error).flat().map((value) => (
        typeof value === 'string' ? value : JSON.stringify(value)
      )).join('; ') || fallback;
    }
    return fallback;
  };

  useEffect(() => {
    if (!district || !benefitPlan) {
      setFinancialYears([]);
      setFinancialYear('');
      return;
    }
    const url = new URL(`${window.location.origin}${baseApiUrl}/payroll/district_reconciliation/`);
    url.searchParams.set('district_id', decodeId(district.id));
    url.searchParams.set('benefit_plan_id', decodeId(benefitPlan.id));
    url.searchParams.set('options', 'financial_years');
    fetch(url, { headers: apiHeaders(), credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(formatMessage('payroll.districtBatch.error.loadFinancialYears'))))
      .then((payload) => {
        const years = payload.financial_years || [];
        setFinancialYears(years);
        setFinancialYear(years.length === 1 ? years[0] : '');
      })
      .catch((error) => setFeedback({ severity: 'error', message: error.message }));
  }, [district, benefitPlan]);

  const downloadApprovedPayrolls = () => {
    if (!canSubmit) return;
    setFeedback(null);
    const url = new URL(`${window.location.origin}${baseApiUrl}/payroll/district_reconciliation/`);
    url.searchParams.set('district_id', decodeId(district.id));
    url.searchParams.set('benefit_plan_id', decodeId(benefitPlan.id));
    url.searchParams.set('financial_year', financialYear);
    fetch(url, { headers: apiHeaders(), credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || formatMessage('payroll.districtBatch.error.download'));
        }
        return response.blob().then((blob) => ({
          blob,
          status: response.headers.get('X-District-Wagesheet-Status'),
        }));
      })
      .then(({ blob, status }) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'district_reconciliation.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        const feedbackByStatus = {
          READY_FOR_PSP: 'payroll.districtBatch.feedback.readyForPsp',
          SUBMITTED_TO_PSP: 'payroll.districtBatch.feedback.submittedToPsp',
          APPLIED: 'payroll.districtBatch.feedback.applied',
        };
        if (feedbackByStatus[status]) {
          setFeedback({
            severity: 'success',
            message: formatMessageWithValues(feedbackByStatus[status], {
              name: formatMessage('payroll.districtBatch.title'),
            }),
          });
        }
      })
      .catch((error) => setFeedback({ severity: 'error', message: error.message }));
  };

  const createDistrictWagesheet = async () => {
    if (!canSubmit) return;
    const url = new URL(`${window.location.origin}${baseApiUrl}/payroll/district_reconciliation/`);
    url.searchParams.set('district_id', decodeId(district.id));
    url.searchParams.set('benefit_plan_id', decodeId(benefitPlan.id));
    url.searchParams.set('financial_year', financialYear);
    url.searchParams.set('action', 'submit_for_approval');
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: apiHeaders(),
        credentials: 'same-origin',
      });
      const responseText = await response.text();
      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch (_) {
        throw new Error(formatMessage('payroll.districtBatch.error.create'));
      }
      if (!response.ok) throw new Error(payload.error || formatMessage('payroll.districtBatch.error.create'));
      const wagesheetName = payload.name || formatMessage('payroll.districtBatch.title');
      const feedbackByStatus = {
        PENDING_DISTRICT_APPROVAL: 'payroll.districtBatch.feedback.pendingDistrict',
        PENDING_NATIONAL_APPROVAL: 'payroll.districtBatch.feedback.pendingNational',
        READY_FOR_PSP: 'payroll.districtBatch.feedback.readyForPsp',
        SUBMITTED_TO_PSP: 'payroll.districtBatch.feedback.submittedToPsp',
        APPLIED: 'payroll.districtBatch.feedback.applied',
      };
      setFeedback({
        severity: 'success',
        message: feedbackByStatus[payload.status]
          ? formatMessageWithValues(feedbackByStatus[payload.status], { name: wagesheetName })
          : formatMessageWithValues('payroll.districtBatch.feedback.default', { status: payload.status }),
      });
      if (onCreated) onCreated();
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message });
    }
  };

  const uploadReconciliation = async () => {
    if (!canSubmit || !file) return;
    const url = `${baseApiUrl}/payroll/district_reconciliation/?district_id=${decodeId(district.id)}&benefit_plan_id=${decodeId(benefitPlan.id)}&financial_year=${encodeURIComponent(financialYear)}`;
    const formData = new FormData();
    formData.append('file', file);
    const headers = new Headers(apiHeaders());
    headers.delete('Content-Type');
    try {
      setIsUploading(true);
      const response = await fetch(url, { method: 'POST', body: formData, headers, credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({
          severity: 'error',
          ...payload,
          message: errorMessage(payload.error, formatMessage('payroll.districtBatch.error.upload')),
        });
        return;
      }
      setFeedback({ severity: payload.status === 'DUPLICATE' ? 'warning' : 'success', ...payload });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message, summary: {} });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadErrorReport = async () => {
    if (!feedback?.upload_id) return;
    const url = new URL(`${window.location.origin}${baseApiUrl}/payroll/district_reconciliation/`);
    url.searchParams.set('action', 'review');
    url.searchParams.set('upload_id', feedback.upload_id);
    url.searchParams.set('district_id', decodeId(district.id));
    url.searchParams.set('benefit_plan_id', decodeId(benefitPlan.id));
    url.searchParams.set('financial_year', financialYear);
    try {
      const response = await fetch(url, { headers: apiHeaders(), credentials: 'same-origin' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || formatMessage('payroll.districtBatch.error.download'));
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'district_reconciliation_error_report.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      setFeedback((previous) => ({ ...previous, severity: 'error', message: error.message }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{formatMessage('payroll.districtBatch.title')}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <PublishedComponent
              pubRef="location.MwDistrictPicker"
              required
              label={formatMessage('payroll.districtBatch.district')}
              value={district}
              onChange={setDistrict}
            />
          </Grid>
          <Grid item xs={12}>
            <PublishedComponent
              pubRef="socialProtection.BenefitPlanPicker"
              required
              withLabel
              type="EVERY_TYPE"
              label={formatMessage('payroll.districtBatch.phase')}
              value={benefitPlan}
              onChange={setBenefitPlan}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth required disabled={!financialYears.length}>
              <InputLabel>{formatMessage('payroll.districtBatch.financialYear')}</InputLabel>
              <Select value={financialYear} onChange={(event) => setFinancialYear(event.target.value)}>
                {financialYears.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          {mode === 'upload' && (
            <Grid item xs={12}>
              <Input
                inputProps={{ accept: '.csv' }}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                type="file"
              />
            </Grid>
          )}
          {feedback && (
            <Grid item xs={12}>
              <FeedbackBanner
                severity={feedback.severity}
                title={feedback.status === 'DUPLICATE'
                  ? formatMessage('payroll.districtBatch.duplicateTitle')
                  : (mode === 'download' ? formatMessage('payroll.districtBatch.title') : formatMessage('payroll.districtBatch.uploadSummary'))}
              >
                {feedback.status === 'DUPLICATE'
                  ? formatMessage('payroll.districtBatch.duplicateMessage')
                  : (feedback.message || formatMessage('payroll.districtBatch.readyForReview'))}
              </FeedbackBanner>
              {[
                ['payroll.districtBatch.totalRecords', feedback.summary?.total_records],
                ['payroll.districtBatch.matchedRecords', feedback.summary?.matched_records],
                ['payroll.districtBatch.paidRecords', feedback.summary?.paid_records],
                ['payroll.districtBatch.unpaidRecords', feedback.summary?.unpaid_records],
                ['payroll.districtBatch.unmatchedRecords', feedback.summary?.unmatched_records],
              ].map(([label, value]) => <Typography key={label}>{formatMessage(label)}: {value || 0}</Typography>)}
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{formatMessage('payroll.summary.close')}</Button>
        {mode === 'download' ? (
          <>
            <Button color="primary" disabled={!canSubmit} onClick={createDistrictWagesheet} variant="contained">
              {formatMessage('payroll.districtBatch.create')}
            </Button>
            <Button color="primary" disabled={!canSubmit} onClick={downloadApprovedPayrolls} variant="outlined">
              {formatMessage('payroll.districtBatch.download')}
            </Button>
          </>
        ) : (
          <>
            {hasUploadIssues && (
              <Button onClick={downloadErrorReport}>
                {formatMessage('payroll.reconciliationUpload.downloadErrorReport')}
              </Button>
            )}
            <Button color="primary" disabled={!canSubmit || !file || isUploading} onClick={uploadReconciliation} variant="contained">
              {formatMessage('payroll.districtBatch.upload')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default DistrictPayrollBatchDialog;
