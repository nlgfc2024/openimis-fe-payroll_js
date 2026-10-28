import React, { useEffect, useState } from 'react';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
} from '@material-ui/core';
import {
  FeedbackBanner, apiHeaders, baseApiUrl, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import { MODULE_NAME } from '../../../constants';

const PARTICIPANT_COLUMNS = [
  ['payroll.reconciliationUpload.rowsDialog.districtName', 'District Name'],
  ['payroll.reconciliationUpload.rowsDialog.catchmentName', 'Catchment Name'],
  ['payroll.reconciliationUpload.rowsDialog.projectName', 'Project Name'],
  ['payroll.reconciliationUpload.rowsDialog.formNumber', 'Form Number'],
  ['payroll.reconciliationUpload.rowsDialog.phoneNumber', 'Phone Number'],
  ['payroll.reconciliationUpload.rowsDialog.firstName', 'First Name'],
  ['payroll.reconciliationUpload.rowsDialog.lastName', 'Last Name'],
  ['payroll.reconciliationUpload.rowsDialog.nationalId', 'National ID'],
  ['payroll.reconciliationUpload.rowsDialog.dateOfBirth', 'Date of Birth'],
  ['payroll.reconciliationUpload.rowsDialog.code', 'Code'],
  ['payroll.reconciliationUpload.rowsDialog.paymentStatus', 'Status'],
  ['payroll.reconciliationUpload.rowsDialog.amount', 'Amount'],
  ['payroll.districtBatch.details.amountReceived', 'Amount Received'],
  ['payroll.reconciliationUpload.rowsDialog.type', 'Type'],
  ['payroll.reconciliationUpload.rowsDialog.receipt', 'Receipt'],
  ['payroll.reconciliationUpload.rowsDialog.paid', 'Paid'],
];

function DistrictWagesheetDetailsDialog({ wagesheet, onClose }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!wagesheet?.id) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    setDetails(null);
    fetch(`${baseApiUrl}/payroll/district_reconciliation/?action=details&batch_id=${wagesheet.id}`, {
      headers: apiHeaders(),
      credentials: 'same-origin',
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || formatMessage('payroll.districtBatch.error.loadDetails'));
        return payload;
      })
      .then((payload) => {
        if (active) setDetails(payload);
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [wagesheet?.id]);

  if (!wagesheet) return null;
  const summary = details?.summary || {};
  const participants = details?.participants || [];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>{details?.name || wagesheet.name}</DialogTitle>
      <DialogContent>
        {loading && <CircularProgress size={24} />}
        {error && <FeedbackBanner severity="error" title={formatMessage('payroll.districtBatch.title')}>{error}</FeedbackBanner>}
        {!loading && !error && details && (
          <>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>{formatMessage('payroll.districtBatch.district')}</TableCell><TableCell>{details.district}</TableCell>
                  <TableCell>{formatMessage('payroll.districtBatch.phase')}</TableCell><TableCell>{wagesheet.phase}</TableCell>
                  <TableCell>{formatMessage('payroll.districtBatch.financialYear')}</TableCell><TableCell>{details.financial_year}</TableCell>
                  <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.paymentStatus')}</TableCell><TableCell>{details.status}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{formatMessage('payroll.districtBatch.details.participants')}</TableCell><TableCell>{summary.participants ?? participants.length}</TableCell>
                  <TableCell>{formatMessage('payroll.districtBatch.details.projects')}</TableCell><TableCell>{summary.projects ?? '-'}</TableCell>
                  <TableCell>{formatMessage('payroll.districtBatch.details.totalWages')}</TableCell><TableCell>{summary.total_wages ?? '-'}</TableCell>
                  <TableCell>{formatMessage('payroll.districtBatch.details.cashOutFees')}</TableCell><TableCell>{summary.total_cash_out_fees ?? '-'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <TableContainer style={{ maxHeight: '55vh', marginTop: 16 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {PARTICIPANT_COLUMNS.map(([label]) => <TableCell key={label}>{formatMessage(label)}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {participants.map((participant, index) => (
                    <TableRow key={`${participant.Code || 'participant'}-${index}`}>
                      {PARTICIPANT_COLUMNS.map(([, field]) => (
                        <TableCell key={field}>{participant[field] ?? '-'}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {!participants.length && (
                    <TableRow><TableCell colSpan={PARTICIPANT_COLUMNS.length}>{formatMessage('payroll.districtBatch.details.noParticipants')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>{formatMessage('payroll.summary.close')}</Button></DialogActions>
    </Dialog>
  );
}

export default DistrictWagesheetDetailsDialog;
