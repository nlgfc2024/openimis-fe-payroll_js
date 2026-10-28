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

function ReconciliationUploadRowsDialog({
  upload, rows, fetching, error, fetchReconciliationUploadRows,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations('payroll', modulesManager);
  const [open, setOpen] = useState(false);

  // GraphQL may return JSON fields either as an object or as JSON text,
  // depending on the server/schema version. Normalise it before rendering.
  const parseJsonValue = (value) => {
    let parsed = value;
    while (typeof parsed === 'string') {
      try {
        const next = JSON.parse(parsed);
        if (next === parsed) break;
        parsed = next;
      } catch (_) {
        break;
      }
    }
    return parsed;
  };

  const columns = [
    ['payroll.reconciliationUpload.rowsDialog.districtName', 'District Name'],
    ['payroll.reconciliationUpload.rowsDialog.catchmentName', 'Catchment Name'],
    ['payroll.reconciliationUpload.rowsDialog.projectName', 'Project Name'],
    ['payroll.reconciliationUpload.rowsDialog.formNumber', 'individual__json_ext__form_number'],
    ['payroll.reconciliationUpload.rowsDialog.phoneNumber', 'individual__json_ext__household_mobile_number'],
    ['payroll.reconciliationUpload.rowsDialog.firstName', 'individual__first_name'],
    ['payroll.reconciliationUpload.rowsDialog.lastName', 'individual__last_name'],
    ['payroll.reconciliationUpload.rowsDialog.nationalId', 'individual__json_ext__national_id'],
    ['payroll.reconciliationUpload.rowsDialog.dateOfBirth', 'individual__dob'],
    ['payroll.reconciliationUpload.rowsDialog.code', 'code'],
    ['payroll.reconciliationUpload.rowsDialog.paymentStatus', 'status'],
    ['payroll.reconciliationUpload.rowsDialog.amount', 'amount'],
    ['payroll.reconciliationUpload.rowsDialog.type', 'type'],
    ['payroll.reconciliationUpload.rowsDialog.receipt', 'receipt'],
    ['payroll.reconciliationUpload.rowsDialog.paid', 'Paid'],
  ];

  const submittedValue = (submittedData, label, field) => {
    const data = parseJsonValue(submittedData);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return '';
    // District batches retain their extra context under the CSV labels; standard
    // payroll reconciliation rows use the mapped field names.
    return data[label] ?? data[field] ?? '';
  };

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
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.validationStatus')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.mismatchReasons')}</TableCell>
                  {columns.map(([label]) => <TableCell key={label}>{formatMessage(label)}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{formatMismatchReasons(row.mismatchReasons) || '-'}</TableCell>
                    {columns.map(([label, field]) => (
                      <TableCell key={label}>{submittedValue(row.submittedData, label, field)}</TableCell>
                    ))}
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
