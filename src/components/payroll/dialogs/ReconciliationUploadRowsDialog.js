import React, { useEffect, useState } from 'react';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@material-ui/core';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useModulesManager, useTranslations } from '@openimis/fe-core';
import { fetchReconciliationUploadRows } from '../../../actions';

const parseJson = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const formatMismatchReasons = (reasons) => {
  const parsedReasons = parseJson(reasons);
  if (parsedReasons !== reasons) return formatMismatchReasons(parsedReasons);
  if (Array.isArray(reasons)) return reasons.map(formatMismatchReasons).filter(Boolean).join(', ');
  if (reasons && typeof reasons === 'object') {
    return Object.entries(reasons)
      .map(([key, value]) => `${key}: ${formatMismatchReasons(value)}`)
      .join(', ');
  }
  return reasons == null ? '' : String(reasons);
};

const formatSubmittedData = (submittedData) => {
  const parsedData = parseJson(submittedData);
  if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
    return formatMismatchReasons(parsedData);
  }
  return Object.entries(parsedData)
    .map(([key, value]) => `${key}: ${formatMismatchReasons(value)}`)
    .join(', ');
};

const getSubmittedValue = (submittedData, field) => {
  const parsedData = parseJson(submittedData);
  return parsedData && typeof parsedData === 'object'
    ? formatMismatchReasons(parsedData[field])
    : '';
};

function ReconciliationUploadRowsDialog({
  upload, rows, fetching, error, fetchReconciliationUploadRows,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations('payroll', modulesManager);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) fetchReconciliationUploadRows(upload.id);
  }, [open, upload.id, fetchReconciliationUploadRows]);

  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>{formatMessage('payroll.reconciliationUpload.viewRows')}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>{formatMessageWithValues('payroll.reconciliationUpload.rowsDialog.title', { fileName: upload.fileName })}</DialogTitle>
        <DialogContent>
          {fetching && <CircularProgress size={24} />}
          {error && <div>{error}</div>}
          {!fetching && !error && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.row')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.formNumber')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.firstName')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.lastName')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.nationalId')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.code')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.status')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.submittedValues')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.mismatchReasons')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{getSubmittedValue(row.submittedData, 'individual__json_ext__form_number') || formatMessage('payroll.reconciliationUpload.notAvailable')}</TableCell>
                    <TableCell>{getSubmittedValue(row.submittedData, 'individual__first_name') || formatMessage('payroll.reconciliationUpload.notAvailable')}</TableCell>
                    <TableCell>{getSubmittedValue(row.submittedData, 'individual__last_name') || formatMessage('payroll.reconciliationUpload.notAvailable')}</TableCell>
                    <TableCell>{row.nationalId}</TableCell>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{formatSubmittedData(row.submittedData) || formatMessage('payroll.reconciliationUpload.notAvailable')}</TableCell>
                    <TableCell>{formatMismatchReasons(row.mismatchReasons) || formatMessage('payroll.reconciliationUpload.notAvailable')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>{formatMessage('payroll.summary.close')}</Button></DialogActions>
      </Dialog>
    </>
  );
}

const mapStateToProps = (state) => ({
  rows: state.payroll.reconciliationUploadRows,
  fetching: state.payroll.fetchingReconciliationUploadRows,
  error: state.payroll.reconciliationUploadRowsError,
});

export default connect(mapStateToProps, (dispatch) => bindActionCreators({
  fetchReconciliationUploadRows,
}, dispatch))(ReconciliationUploadRowsDialog);
