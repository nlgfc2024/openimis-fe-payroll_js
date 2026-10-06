import React, { useRef, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Input, LinearProgress, Typography,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { injectIntl } from 'react-intl';
import { apiHeaders, baseApiUrl, formatMessage } from '@openimis/fe-core';

function PayrollPaymentDataUploadDialog({ intl, payrollUuid, onUploadResult }) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState(null);
  const submitting = useRef(false);
  const message = (key) => formatMessage(intl, 'payroll', `payroll.paymentData.upload.${key}`);

  const handleOpen = () => {
    setFile(null);
    setNotice(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (submitting.current) return;
    setFile(null);
    setNotice(null);
    setIsOpen(false);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!payrollUuid || !file) {
      setNotice({ severity: 'error', key: 'required' });
      return;
    }
    if (!/\.csv$/i.test(file.name)) {
      setNotice({ severity: 'error', key: 'invalidFile' });
      return;
    }
    if (file.size === 0) {
      setNotice({ severity: 'error', key: 'emptyFile' });
      return;
    }

    submitting.current = true;
    setIsUploading(true);
    setNotice(null);
    let completedResult = null;

    try {
      const headers = new Headers(apiHeaders());
      headers.delete('Content-Type');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(
        `${baseApiUrl}/payroll/csv_reconciliation/?payroll_id=${encodeURIComponent(payrollUuid)}`,
        {
          headers,
          body: formData,
          method: 'POST',
          credentials: 'same-origin',
        },
      );

      let data = null;
      try {
        data = await response.json();
      } catch (error) {
        data = null;
      }

      if (response.status === 401 || response.status === 403) {
        completedResult = { severity: 'error', key: 'permission' };
      } else if (response.status === 409 && data?.error === 'csv_reconciliation.duplicate_file') {
        completedResult = { severity: 'warning', key: 'duplicateFile' };
      } else if (!response.ok || data?.success === false) {
        completedResult = { severity: 'error', key: 'failed' };
      } else if (data?.success !== true) {
        completedResult = { severity: 'warning', key: 'unknown' };
      } else {
        const processed = data.summary?.affected_rows;
        const skipped = data.summary?.skipped_items;
        const total = data.summary?.total_number_of_benefits_in_file;
        const countsValid = [processed, skipped, total].every(
          (value) => Number.isInteger(value) && value >= 0,
        ) && processed + skipped === total;
        const values = countsValid ? { processed, skipped } : {};

        if (data.status === 'SUCCESS') {
          completedResult = {
            severity: 'success',
            key: countsValid ? 'successCounts' : 'success',
            values,
          };
        } else if (data.status === 'PARTIAL_SUCCESS') {
          let key = 'partial';
          if (countsValid) key = processed === 0 ? 'noneProcessed' : 'partialCounts';
          completedResult = { severity: 'warning', key, values };
        } else if (data.status == null) {
          completedResult = { severity: 'info', key: 'accepted', values: {} };
        } else {
          completedResult = { severity: 'warning', key: 'unknown' };
        }
      }
    } catch (error) {
      completedResult = { severity: 'warning', key: 'unknown' };
    } finally {
      submitting.current = false;
      setIsUploading(false);
    }

    // Keep completion/refresh handling outside the request error handler.
    if (completedResult) {
      handleClose();
      onUploadResult(completedResult);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outlined"
        color="primary"
        style={{ border: 0, marginTop: 6 }}
      >
        {message('label')}
      </Button>
      <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth="sm">
        <form onSubmit={onSubmit} noValidate>
          <DialogTitle>{message('label')}</DialogTitle>
          <DialogContent>
            {notice && (
              <Alert severity={notice.severity}>{message(notice.key)}</Alert>
            )}
            <Input
              id="payroll-reconciliation-file"
              type="file"
              disabled={isUploading}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setNotice(null);
              }}
              inputProps={{
                accept: '.csv,text/csv,application/csv',
                'aria-label': message('label'),
              }}
            />
            {isUploading && (
              <div role="status" aria-live="polite">
                <Typography>{message('processing')}</Typography>
                <LinearProgress />
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={isUploading}>
              {message('cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isUploading || !file || !payrollUuid}
            >
              {message(isUploading ? 'processing' : 'label')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

export default injectIntl(PayrollPaymentDataUploadDialog);
