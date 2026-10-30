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

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

function ConsolidatePayrollsDialog({ createConsolidatedPayroll }) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [open, setOpen] = useState(false);
  const [district, setDistrict] = useState(null);
  const [benefitPlan, setBenefitPlan] = useState(null);
  const [selected, setSelected] = useState([]);
  // Locations use an integer primary key behind their Relay ID. The
  // consolidation API deliberately uses the location UUID instead.
  const districtId = district?.uuid || null;
  const benefitPlanId = benefitPlan?.id ? decodeId(benefitPlan.id) : null;
  const skipCandidates = !districtId || !benefitPlanId;
  const { data, isLoading, error } = useGraphqlQuery(
    `query ConsolidationCandidates($districtId: UUID!, $benefitPlanId: UUID!, $skipCandidates: Boolean!) {
      consolidationCandidates(districtId: $districtId, benefitPlanId: $benefitPlanId) @skip(if: $skipCandidates) {
        id name paymentMethod status benefitConsumption { id amount }
      }
    }`,
    {
      districtId: districtId || EMPTY_UUID,
      benefitPlanId: benefitPlanId || EMPTY_UUID,
      skipCandidates,
    },
    { skip: !open },
  );
  const candidates = data?.consolidationCandidates || [];
  useEffect(() => setSelected([]), [districtId, benefitPlanId]);
  const toggle = (id) => setSelected((current) => (current.includes(id)
    ? current.filter((item) => item !== id) : [...current, id]));
  const allSelected = candidates.length > 0 && selected.length === candidates.length;
  const total = candidates.filter((item) => selected.includes(item.id)).reduce(
    (sum, item) => sum + item.benefitConsumption.reduce((amount, benefit) => amount + Number(benefit.amount || 0), 0), 0,
  );
  const create = () => {
    createConsolidatedPayroll({ district, benefitPlan, sourcePayrollIds: selected }, 'Create consolidated payroll');
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
        <PublishedComponent pubRef="socialProtection.BenefitPlanPicker" value={benefitPlan} onChange={setBenefitPlan} withLabel label="Phase" required />
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
