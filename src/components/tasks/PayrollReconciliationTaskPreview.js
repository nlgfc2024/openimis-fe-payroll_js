import React, { useEffect } from 'react';
import {
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { fetchReconciliationUploadRows } from '../../actions';

const parseJson = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const taskData = (task) => parseJson(
  task?.businessData?.incoming_data || task?.businessData || {},
);

const submittedValue = (row, ...fields) => {
  const submittedData = parseJson(row?.submittedData);
  if (!submittedData || typeof submittedData !== 'object') return '-';
  const value = fields.map((field) => submittedData[field]).find((item) => item !== undefined && item !== '');
  return value === undefined || value === null || value === '' ? '-' : String(value);
};

const mismatchReasons = (value) => {
  const reasons = parseJson(value);
  if (Array.isArray(reasons)) return reasons.join(', ') || '-';
  if (reasons && typeof reasons === 'object') return Object.values(reasons).flat().join(', ') || '-';
  return reasons || '-';
};

function PayrollReconciliationTaskPreview({
  task,
  rows,
  fetching,
  error,
  fetchReconciliationUploadRows,
}) {
  const data = taskData(task);
  const uploadId = data?.upload_id || data?.uploadId;

  useEffect(() => {
    if (uploadId) fetchReconciliationUploadRows(uploadId);
  }, [uploadId, fetchReconciliationUploadRows]);

  if (!uploadId) {
    return <Typography color="error">This reconciliation task has no uploaded file reference.</Typography>;
  }

  return (
    <>
      <Typography variant="subtitle1">
        Uploaded beneficiary reconciliation data ({data?.summary?.total_records ?? rows.length} rows)
      </Typography>
      {fetching && <CircularProgress size={24} />}
      {error && <Typography color="error">{error}</Typography>}
      {!fetching && !error && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Row</TableCell>
              <TableCell>Form Number</TableCell>
              <TableCell>First Name</TableCell>
              <TableCell>Last Name</TableCell>
              <TableCell>National ID</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Amount Received</TableCell>
              <TableCell>Paid</TableCell>
              <TableCell>Receipt</TableCell>
              <TableCell>Validation</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.rowNumber}</TableCell>
                <TableCell>{submittedValue(row, 'individual__json_ext__form_number')}</TableCell>
                <TableCell>{submittedValue(row, 'individual__first_name')}</TableCell>
                <TableCell>{submittedValue(row, 'individual__last_name')}</TableCell>
                <TableCell>{row.nationalId || submittedValue(row, 'individual__json_ext__national_id')}</TableCell>
                <TableCell>{row.code || submittedValue(row, 'code')}</TableCell>
                <TableCell>{submittedValue(row, 'amount')}</TableCell>
                <TableCell>{submittedValue(row, 'amount_received', 'Amount Received')}</TableCell>
                <TableCell>{submittedValue(row, 'Paid')}</TableCell>
                <TableCell>{submittedValue(row, 'receipt')}</TableCell>
                <TableCell>{row.status}: {mismatchReasons(row.mismatchReasons)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
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
}, dispatch))(PayrollReconciliationTaskPreview);
