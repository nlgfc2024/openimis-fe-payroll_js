import React, { useEffect, useState } from 'react';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from '@material-ui/core';
import {
  decodeId, PublishedComponent, useGraphqlQuery, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createConsolidatedPayroll } from '../../../actions';
import { MODULE_NAME } from '../../../constants';

function ConsolidatePayrollsDialog({ createConsolidatedPayroll }) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [open, setOpen] = useState(false);
  const [district, setDistrict] = useState(null);
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [selected, setSelected] = useState([]);
  const districtId = district?.id ? decodeId(district.id) : null;
  const paymentPlanId = paymentPlan?.id ? decodeId(paymentPlan.id) : null;
  const { data, isLoading, error } = useGraphqlQuery(
    `query ConsolidationCandidates($districtId: UUID!, $paymentPlanId: UUID!) {
      consolidationCandidates(districtId: $districtId, paymentPlanId: $paymentPlanId) {
        id name paymentMethod status benefitConsumption { id amount }
      }
    }`,
    { districtId, paymentPlanId },
    { skip: !open || !districtId || !paymentPlanId },
  );
  const candidates = data?.consolidationCandidates || [];
  useEffect(() => setSelected([]), [districtId, paymentPlanId]);
  const toggle = (id) => setSelected((current) => (current.includes(id)
    ? current.filter((item) => item !== id) : [...current, id]));
  const allSelected = candidates.length > 0 && selected.length === candidates.length;
  const total = candidates.filter((item) => selected.includes(item.id)).reduce(
    (sum, item) => sum + item.benefitConsumption.reduce((amount, benefit) => amount + Number(benefit.amount || 0), 0), 0,
  );
  const create = () => {
    createConsolidatedPayroll({ district, paymentPlan, sourcePayrollIds: selected }, 'Create consolidated payroll');
    setOpen(false);
  };
  return <>
    <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
      {formatMessage('payroll.consolidation.create')}
    </Button>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
      <DialogTitle>{formatMessage('payroll.consolidation.title')}</DialogTitle>
      <DialogContent>
        <PublishedComponent pubRef="location.MwDistrictPicker" value={district} onChange={setDistrict} />
        <PublishedComponent pubRef="contributionPlan.PaymentPlanPicker" value={paymentPlan} onChange={setPaymentPlan} required />
        {error && <Typography color="error">{String(error)}</Typography>}
        <Table size="small"><TableHead><TableRow>
          <TableCell><Checkbox checked={allSelected} onChange={() => setSelected(allSelected ? [] : candidates.map((item) => item.id))} /></TableCell>
          <TableCell>{formatMessage('payroll.name')}</TableCell><TableCell>{formatMessage('payroll.summary.beneficiaries')}</TableCell><TableCell>{formatMessage('payroll.amount')}</TableCell>
        </TableRow></TableHead><TableBody>
          {candidates.map((item) => <TableRow key={item.id}>
            <TableCell><Checkbox checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /></TableCell>
            <TableCell>{item.name}</TableCell><TableCell>{item.benefitConsumption.length}</TableCell>
            <TableCell>{item.benefitConsumption.reduce((sum, benefit) => sum + Number(benefit.amount || 0), 0)}</TableCell>
          </TableRow>)}
        </TableBody></Table>
        {isLoading && <Typography>{formatMessage('payroll.consolidation.loading')}</Typography>}
        <Typography>{formatMessageWithValues('payroll.consolidation.selected', { count: selected.length, amount: total })}</Typography>
      </DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)}>{formatMessage('payroll.summary.close')}</Button><Button color="primary" disabled={!selected.length} onClick={create}>{formatMessage('payroll.consolidation.confirm')}</Button></DialogActions>
    </Dialog>
  </>;
}
export default connect(null, (dispatch) => bindActionCreators({ createConsolidatedPayroll }, dispatch))(ConsolidatePayrollsDialog);
