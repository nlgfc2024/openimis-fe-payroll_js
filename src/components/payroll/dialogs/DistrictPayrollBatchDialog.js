import React, { useState } from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import { Grid, Input, Typography } from '@material-ui/core';
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

function DistrictPayrollBatchDialog({ open, onClose, mode = 'download' }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const [district, setDistrict] = useState(null);
  const [benefitPlan, setBenefitPlan] = useState(null);
  const [file, setFile] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const canDownload = district && benefitPlan;

  const downloadApprovedPayrolls = () => {
    if (!canDownload) return;
    setFeedback(null);
    const url = new URL(`${window.location.origin}${baseApiUrl}/payroll/district_reconciliation/`);
    url.searchParams.set('district_id', decodeId(district.id));
    url.searchParams.set('benefit_plan_id', decodeId(benefitPlan.id));
    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'District payroll file could not be generated.');
        }
        return response.blob();
      })
      .then((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'district_reconciliation.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      })
      .catch((error) => setFeedback({ severity: 'error', message: error.message }));
  };

  const uploadReconciliation = async () => {
    if (!canDownload || !file) return;
    const url = `${baseApiUrl}/payroll/district_reconciliation/?district_id=${decodeId(district.id)}&benefit_plan_id=${decodeId(benefitPlan.id)}`;
    const formData = new FormData();
    formData.append('file', file);
    const headers = new Headers(apiHeaders());
    headers.delete('Content-Type');
    try {
      setIsUploading(true);
      const response = await fetch(url, { method: 'POST', body: formData, headers, credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'District reconciliation upload failed.');
      setFeedback({ severity: payload.status === 'DUPLICATE' ? 'warning' : 'success', ...payload });
    } catch (error) {
      setFeedback({ severity: 'error', message: error.message, summary: {} });
    } finally {
      setIsUploading(false);
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
                title={feedback.status === 'DUPLICATE' ? 'Duplicate reconciliation file' : 'Upload summary'}
              >
                {feedback.status === 'DUPLICATE'
                  ? 'This file has already been uploaded. Use the existing upload or upload a corrected file.'
                  : (feedback.message || 'District reconciliation is ready for review.')}
              </FeedbackBanner>
              {[
                ['Total records detected', feedback.summary?.total_records],
                ['Matched records', feedback.summary?.matched_records],
                ['Paid records', feedback.summary?.paid_records],
                ['Unpaid records', feedback.summary?.unpaid_records],
                ['Unmatched records', feedback.summary?.unmatched_records],
              ].map(([label, value]) => <Typography key={label}>{label}: {value || 0}</Typography>)}
            </Grid>
          )}
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
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{formatMessage('payroll.summary.close')}</Button>
        {mode === 'download' ? (
          <Button color="primary" disabled={!canDownload} onClick={downloadApprovedPayrolls} variant="contained">
            {formatMessage('payroll.districtBatch.download')}
          </Button>
        ) : (
          <Button color="primary" disabled={!canDownload || !file || isUploading} onClick={uploadReconciliation} variant="contained">
            {formatMessage('payroll.districtBatch.upload')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default DistrictPayrollBatchDialog;
