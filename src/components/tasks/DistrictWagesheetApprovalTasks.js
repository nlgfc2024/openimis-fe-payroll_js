import React, { useEffect, useState } from 'react';
import {
  CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Typography,
} from '@material-ui/core';
import {
  FeedbackBanner, apiHeaders, baseApiUrl, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import { MODULE_NAME } from '../../constants';

const PARTICIPANT_COLUMNS = [
  ['payroll.reconciliationUpload.rowsDialog.districtName', 'District Name'],
  ['payroll.reconciliationUpload.rowsDialog.catchmentName', 'Catchment Name'],
  ['payroll.reconciliationUpload.rowsDialog.projectName', 'Project Name'],
  ['payroll.reconciliationUpload.rowsDialog.formNumber', 'Form Number'],
  ['payroll.reconciliationUpload.rowsDialog.firstName', 'First Name'],
  ['payroll.reconciliationUpload.rowsDialog.lastName', 'Last Name'],
  ['payroll.reconciliationUpload.rowsDialog.nationalId', 'National ID'],
  ['payroll.reconciliationUpload.rowsDialog.amount', 'Amount'],
  ['payroll.reconciliationUpload.rowsDialog.paid', 'Paid'],
];

function DistrictWagesheetApprovalTaskPanel({ data, stage }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!data?.id) return undefined;
    let active = true;
    setDetails(null);
    setError(null);
    fetch(`${baseApiUrl}/payroll/district_reconciliation/?action=details&batch_id=${data.id}`, {
      headers: apiHeaders(), credentials: 'same-origin',
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || formatMessage('payroll.districtBatch.error.loadDetails'));
        return payload;
      })
      .then((payload) => active && setDetails(payload))
      .catch((fetchError) => active && setError(fetchError.message));
    return () => { active = false; };
  }, [data?.id]);

  if (error) return <FeedbackBanner severity="error" title={formatMessage('payroll.districtBatch.title')}>{error}</FeedbackBanner>;
  if (!details) return <CircularProgress size={24} />;

  const summary = details.summary || {};
  const participants = details.participants || [];
  return (
    <div>
      <Typography variant="h6">
        {formatMessage(stage === 'national'
          ? 'payroll.tasks.nationalWagesheetApproval.title'
          : 'payroll.tasks.districtWagesheetApproval.title')}
      </Typography>
      <Table size="small">
        <TableBody>
          <TableRow><TableCell>{formatMessage('payroll.districtBatch.district')}</TableCell><TableCell>{details.district}</TableCell></TableRow>
          <TableRow><TableCell>{formatMessage('payroll.districtBatch.phase')}</TableCell><TableCell>{data.phase}</TableCell></TableRow>
          <TableRow><TableCell>{formatMessage('payroll.districtBatch.financialYear')}</TableCell><TableCell>{details.financial_year}</TableCell></TableRow>
          <TableRow><TableCell>{formatMessage('payroll.districtBatch.details.participants')}</TableCell><TableCell>{summary.participants ?? participants.length}</TableCell></TableRow>
          <TableRow><TableCell>{formatMessage('payroll.districtBatch.details.projects')}</TableCell><TableCell>{summary.projects ?? '-'}</TableCell></TableRow>
          <TableRow><TableCell>{formatMessage('payroll.districtBatch.details.totalWages')}</TableCell><TableCell>{summary.total_wages ?? '-'}</TableCell></TableRow>
        </TableBody>
      </Table>
      <Typography variant="subtitle1">{formatMessage('payroll.districtBatch.details.participants')}</Typography>
      <TableContainer style={{ maxHeight: '45vh' }}>
        <Table stickyHeader size="small">
          <TableHead><TableRow>{PARTICIPANT_COLUMNS.map(([label]) => <TableCell key={label}>{formatMessage(label)}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {participants.map((participant, index) => (
              <TableRow key={`${participant.Code || 'participant'}-${index}`}>
                {PARTICIPANT_COLUMNS.map(([, field]) => <TableCell key={field}>{participant[field] ?? '-'}</TableCell>)}
              </TableRow>
            ))}
            {!participants.length && <TableRow><TableCell colSpan={PARTICIPANT_COLUMNS.length}>{formatMessage('payroll.districtBatch.details.noParticipants')}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

const DistrictWagesheetApprovalTaskTableHeaders = () => [''];
const DistrictWagesheetDistrictApprovalTaskItemFormatters = () => [
  (data) => <DistrictWagesheetApprovalTaskPanel data={data} stage="district" />,
];
const DistrictWagesheetNationalApprovalTaskItemFormatters = () => [
  (data) => <DistrictWagesheetApprovalTaskPanel data={data} stage="national" />,
];

export {
  DistrictWagesheetApprovalTaskTableHeaders,
  DistrictWagesheetDistrictApprovalTaskItemFormatters,
  DistrictWagesheetNationalApprovalTaskItemFormatters,
};
