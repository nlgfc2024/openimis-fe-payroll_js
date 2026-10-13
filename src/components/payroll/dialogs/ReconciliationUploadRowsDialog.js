import React, { useEffect, useState } from 'react';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@material-ui/core';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useModulesManager, useTranslations } from '@openimis/fe-core';
import { fetchReconciliationUploadRows } from '../../../actions';

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
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.code')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.nationalId')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.status')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.submittedValues')}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.mismatchReasons')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.nationalId}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{Object.entries(row.submittedData || {}).map(([key, value]) => `${key}: ${value}`).join(', ') || formatMessage('payroll.reconciliationUpload.notAvailable')}</TableCell>
                    <TableCell>{(row.mismatchReasons || []).join(', ') || formatMessage('payroll.reconciliationUpload.notAvailable')}</TableCell>
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
