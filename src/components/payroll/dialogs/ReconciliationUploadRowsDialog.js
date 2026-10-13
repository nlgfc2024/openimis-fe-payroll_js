import React, { useEffect, useState } from 'react';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@material-ui/core';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { fetchReconciliationUploadRows } from '../../../actions';

function ReconciliationUploadRowsDialog({
  upload, rows, fetching, error, fetchReconciliationUploadRows,
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) fetchReconciliationUploadRows(upload.id);
  }, [open, upload.id, fetchReconciliationUploadRows]);

  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>View rows</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Reconciliation rows — {upload.fileName}</DialogTitle>
        <DialogContent>
          {fetching && <CircularProgress size={24} />}
          {error && <div>{error}</div>}
          {!fetching && !error && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>National ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted values</TableCell>
                  <TableCell>Mismatch reasons</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.nationalId}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{Object.entries(row.submittedData || {}).map(([key, value]) => `${key}: ${value}`).join(', ') || '—'}</TableCell>
                    <TableCell>{(row.mismatchReasons || []).join(', ') || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Close</Button></DialogActions>
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
