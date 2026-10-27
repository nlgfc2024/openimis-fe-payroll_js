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
    ['District Name', 'individual__location__parent__parent__parent__name'],
    ['Catchment Name', 'Catchment Name'],
    ['Project Name', 'Project Name'],
    ['Form Number', 'individual__json_ext__form_number'],
    ['Phone Number', 'individual__json_ext__household_mobile_number'],
    ['First Name', 'individual__first_name'],
    ['Last Name', 'individual__last_name'],
    ['National ID', 'individual__json_ext__national_id'],
    ['Date of Birth', 'individual__dob'],
    ['Code', 'code'],
    ['Status', 'status'],
    ['Amount', 'amount'],
    ['Type', 'type'],
    ['Receipt', 'receipt'],
    ['Paid', 'Paid'],
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
                  {columns.map(([label]) => <TableCell key={label}>{label}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
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
