import React, { useEffect, useMemo, useState } from 'react';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tooltip,
} from '@material-ui/core';
import VisibilityIcon from '@material-ui/icons/Visibility';
import GetAppIcon from '@material-ui/icons/GetApp';
import {
  FeedbackBanner, apiHeaders, baseApiUrl, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import DistrictWagesheetDetailsDialog from './DistrictWagesheetDetailsDialog';
import { MODULE_NAME } from '../../../constants';

const ROWS_PER_PAGE = [10, 25, 50];

function DistrictWagesheetListDialog({ open, onClose }) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [wagesheets, setWagesheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState(null);

  const downloadWagesheet = (wagesheet) => {
    const url = new URL(`${window.location.origin}${baseApiUrl}/payroll/district_reconciliation/`);
    url.searchParams.set('district_id', wagesheet.district_id);
    url.searchParams.set('benefit_plan_id', wagesheet.benefit_plan_id);
    url.searchParams.set('financial_year', wagesheet.financial_year);
    window.fetch(url, { headers: apiHeaders(), credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || formatMessage('payroll.districtBatch.error.download'));
        }
        return response.blob();
      })
      .then((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${wagesheet.name}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      })
      .catch((downloadError) => setError(downloadError.message));
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`${baseApiUrl}/payroll/district_reconciliation/?action=list`, {
      headers: apiHeaders(),
      credentials: 'same-origin',
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || formatMessage('payroll.districtBatch.error.loadList'));
        return payload.wagesheets || [];
      })
      .then((items) => {
        setWagesheets(items);
        setPage(0);
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  // `formatMessage` is recreated by the translations hook on render. Including
  // it here repeatedly reset the list request before the table could settle.
  }, [open]);

  const visibleWagesheets = useMemo(
    () => wagesheets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [wagesheets, page, rowsPerPage],
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>{formatMessageWithValues('payroll.districtBatch.listTitle', { count: wagesheets.length })}</DialogTitle>
        <DialogContent>
          {loading && <CircularProgress size={24} />}
          {error && <FeedbackBanner severity="error" title={formatMessage('payroll.districtBatch.listAction')}>{error}</FeedbackBanner>}
          {!loading && !error && (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{formatMessage('payroll.summary.name')}</TableCell>
                    <TableCell>{formatMessage('payroll.districtBatch.district')}</TableCell>
                    <TableCell>{formatMessage('payroll.districtBatch.phase')}</TableCell>
                    <TableCell>{formatMessage('payroll.districtBatch.financialYear')}</TableCell>
                    <TableCell>{formatMessage('payroll.reconciliationUpload.rowsDialog.paymentStatus')}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleWagesheets.map((wagesheet) => (
                    <TableRow key={wagesheet.id} hover onDoubleClick={() => setSelected(wagesheet)}>
                      <TableCell>{wagesheet.name}</TableCell>
                      <TableCell>{wagesheet.district}</TableCell>
                      <TableCell>{wagesheet.phase}</TableCell>
                      <TableCell>{wagesheet.financial_year}</TableCell>
                      <TableCell>{wagesheet.status}</TableCell>
                      <TableCell>
                        <Tooltip title={formatMessage('payroll.districtBatch.list.download')}>
                          <span>
                            <IconButton
                              disabled={!['READY_FOR_PSP', 'SUBMITTED_TO_PSP', 'APPLIED'].includes(wagesheet.status)}
                              onClick={() => downloadWagesheet(wagesheet)}
                            >
                              <GetAppIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={formatMessage('payroll.districtBatch.list.view')}>
                          <IconButton onClick={() => setSelected(wagesheet)}><VisibilityIcon /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!visibleWagesheets.length && (
                    <TableRow><TableCell colSpan={6}>{formatMessage('payroll.districtBatch.list.empty')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={wagesheets.length}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE}
                onChangePage={(_, nextPage) => setPage(nextPage)}
                onChangeRowsPerPage={(event) => {
                  setRowsPerPage(Number(event.target.value));
                  setPage(0);
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions><Button color="primary" onClick={onClose}>{formatMessage('payroll.summary.close')}</Button></DialogActions>
      </Dialog>
      {selected && <DistrictWagesheetDetailsDialog wagesheet={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

export default DistrictWagesheetListDialog;
