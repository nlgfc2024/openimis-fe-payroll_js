import React, { useEffect, useState } from 'react';
import {
  Button,
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
import {
  useGraphqlQuery, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import { fetchReconciliationUploadRows } from '../../actions';
import { MODULE_NAME } from '../../constants';
import PayrollPage from '../../pages/payroll/PayrollPage';

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
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const data = taskData(task);
  const uploadId = data?.upload_id || data?.uploadId;
  const summary = data?.summary || {};
  const [selectedPayrollId, setSelectedPayrollId] = useState(null);
  const { data: payrollData } = useGraphqlQuery(
    `query ReconciliationTaskPayroll($id: ID!) {
      payroll(id: $id) {
        edges {
          node {
            payrollType
            consolidatedMembers { sourcePayrollId sourcePayrollName }
          }
        }
      }
    }`,
    { id: data?.id },
    { skip: !data?.id },
  );
  const payroll = payrollData?.payroll?.edges?.[0]?.node;
  const isConsolidated = data?.consolidated || payroll?.payrollType === 'CONSOLIDATED';
  const sourcePayrolls = payroll?.payrollType === 'CONSOLIDATED'
    ? (payroll?.consolidatedMembers || []).map((member) => ({
      id: member.sourcePayrollId,
      name: member.sourcePayrollName,
    }))
    : (data?.included_payrolls || []).filter((item) => item.id !== data?.id);
  const totalRecords = summary.total_records ?? rows.length;
  const previewSummary = [
    ['payroll.reconciliationUpload.taskPreview.district', data?.district],
    ['payroll.reconciliationUpload.taskPreview.phase', data?.phase],
    ['payroll.reconciliationUpload.taskPreview.totalRecords', summary.total_records],
    ['payroll.reconciliationUpload.taskPreview.matchedRecords', summary.matched_records],
    ['payroll.reconciliationUpload.taskPreview.paidRecords', summary.paid_records],
    ['payroll.reconciliationUpload.taskPreview.unpaidRecords', summary.unpaid_records],
    ['payroll.reconciliationUpload.taskPreview.unmatchedRecords', summary.unmatched_records],
  ];

  useEffect(() => {
    if (uploadId) fetchReconciliationUploadRows(uploadId);
  }, [uploadId, fetchReconciliationUploadRows]);

  if (!uploadId) {
    return <Typography color="error">{formatMessage('payroll.reconciliationUpload.task.noUpload')}</Typography>;
  }

  return (
    <>
      <Typography variant="subtitle1">
        {formatMessageWithValues('payroll.reconciliationUpload.taskPreview.title', { totalRecords })}
      </Typography>
      {fetching && <CircularProgress size={24} />}
      {error && <Typography color="error">{error}</Typography>}
      {!fetching && !error && (
        <>
          <Table size="small">
            <TableBody>
              {previewSummary.map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell>{formatMessage(label)}</TableCell>
                  <TableCell>{value ?? formatMessage('payroll.reconciliationUpload.notAvailable')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isConsolidated && (
            <>
              <Typography variant="subtitle1">
                {formatMessage('payroll.consolidation.sourcePayrolls')}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{formatMessage('payroll.consolidation.sourcePayroll')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sourcePayrolls.map((payroll) => (
                    <TableRow key={payroll.id} selected={payroll.id === selectedPayrollId}>
                      <TableCell>
                        <Button
                          color="primary"
                          aria-pressed={payroll.id === selectedPayrollId}
                          onClick={() => setSelectedPayrollId(payroll.id)}
                        >
                          {payroll.name}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {selectedPayrollId && (
                <PayrollPage
                  key={selectedPayrollId}
                  taskPayrollUuid={selectedPayrollId}
                />
              )}
            </>
          )}
          {totalRecords > rows.length && (
            <Typography variant="body2">
              {formatMessageWithValues('payroll.reconciliationUpload.taskPreview.truncated', {
                shownRows: rows.length,
                totalRecords,
              })}
            </Typography>
          )}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.row')}</TableCell>
                <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.formNumber')}</TableCell>
                <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.firstName')}</TableCell>
                <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.lastName')}</TableCell>
                <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.nationalId')}</TableCell>
                <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.code')}</TableCell>
                <TableCell>{formatMessage('payroll.consolidation.sourcePayroll')}</TableCell>
                <TableCell>{formatMessage('payroll.reconciliationUpload.taskPreview.amount')}</TableCell>
                <TableCell>{formatMessage('payroll.reconciliationUpload.taskPreview.amountReceived')}</TableCell>
                <TableCell>{formatMessage('payroll.payrollPaymentFile.paidRecords')}</TableCell>
                <TableCell>{formatMessage('payroll.reconciliationUpload.taskPreview.receipt')}</TableCell>
                <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.status')}</TableCell>
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
                  <TableCell style={{
                    maxWidth: 220,
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                  }}
                  >
                    {submittedValue(row, 'Source Payroll')}
                  </TableCell>
                  <TableCell>{submittedValue(row, 'amount')}</TableCell>
                  <TableCell>{submittedValue(row, 'amount_received', 'Amount Received')}</TableCell>
                  <TableCell>{submittedValue(row, 'Paid')}</TableCell>
                  <TableCell>{submittedValue(row, 'receipt')}</TableCell>
                  <TableCell>{row.status}: {mismatchReasons(row.mismatchReasons)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
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
