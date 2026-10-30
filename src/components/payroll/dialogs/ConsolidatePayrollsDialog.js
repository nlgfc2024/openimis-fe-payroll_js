import React, { useEffect, useState } from 'react';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from '@material-ui/core';
import {
  Autocomplete,
  decodeId,
  PublishedComponent,
  SearcherActionButton,
  showPageFeedback,
  useGraphqlQuery,
  useModulesManager,
  useTranslations,
  waitForMutation,
} from '@openimis/fe-core';
import AddIcon from '@material-ui/icons/Add';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createConsolidatedPayroll } from '../../../actions';
import { MODULE_NAME } from '../../../constants';

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';
const checkboxIcons = {
  icon: <CheckBoxOutlineBlankIcon style={{ color: '#1b5e20' }} />,
  checkedIcon: <CheckBoxIcon style={{ color: '#1b5e20' }} />,
};

function ConsolidatePayrollsDialog({
  createConsolidatedPayroll,
  showPageFeedback,
  waitForMutation: waitForMutationStatus,
  buttonClassName,
  buttonSize = 'medium',
}) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [open, setOpen] = useState(false);
  const [district, setDistrict] = useState(null);
  const [benefitPlan, setBenefitPlan] = useState(null);
  const [selected, setSelected] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  // Locations use an integer primary key behind their Relay ID. The
  // consolidation API deliberately uses the location UUID instead.
  const districtId = district?.uuid || null;
  const benefitPlanId = benefitPlan?.uuid || null;
  const skipCandidates = !districtId || !benefitPlanId;
  const { data: phasesData, isLoading: phasesLoading, error: phasesError } = useGraphqlQuery(
    `query ConsolidationPhases($districtId: UUID!, $skipPhases: Boolean!) {
      consolidationPhases(districtId: $districtId) @skip(if: $skipPhases) { uuid code name }
    }`,
    { districtId: districtId || EMPTY_UUID, skipPhases: !districtId },
    { skip: !open },
  );
  const phases = phasesData?.consolidationPhases || [];
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
  useEffect(() => setBenefitPlan(null), [districtId]);
  useEffect(() => setSelected([]), [districtId, benefitPlanId]);
  const toggle = (id) => setSelected((current) => (current.includes(id)
    ? current.filter((item) => item !== id) : [...current, id]));
  const allSelected = candidates.length > 0 && selected.length === candidates.length;
  const total = candidates.filter((item) => selected.includes(item.id)).reduce(
    (sum, item) => sum + item.benefitConsumption.reduce((amount, benefit) => amount + Number(benefit.amount || 0), 0), 0,
  );
  const create = async () => {
    try {
      setIsCreating(true);
      const response = await createConsolidatedPayroll(
        { district, benefitPlan, sourcePayrollIds: selected },
        'Create consolidated payroll',
      );
      if (response?.error || response?.payload?.errors?.length) {
        const error = response?.error || response?.payload?.errors?.[0];
        showPageFeedback({
          severity: 'error',
          title: formatMessage('payroll.consolidation.createFailure.title'),
          message: error?.message || error?.detail
            || formatMessage('payroll.consolidation.createFailure.message'),
        });
        return;
      }

      const clientMutationId = response?.payload?.data?.createConsolidatedPayroll?.clientMutationId;
      const result = clientMutationId && await waitForMutationStatus(clientMutationId);
      if (result?.status !== 2) {
        showPageFeedback({
          severity: 'error',
          title: formatMessage('payroll.consolidation.createFailure.title'),
          message: result?.error?.message || result?.error?.detail
            || formatMessage('payroll.consolidation.createFailure.message'),
        });
        return;
      }

      showPageFeedback({
        severity: 'success',
        title: formatMessage('payroll.consolidation.createSuccess.title'),
        message: formatMessageWithValues('payroll.consolidation.createSuccess.message', {
          district: district?.name || district?.label
            || formatMessage('payroll.consolidation.selectedDistrict'),
        }),
      });
      setOpen(false);
      setSelected([]);
    } catch (error) {
      showPageFeedback({
        severity: 'error',
        title: formatMessage('payroll.consolidation.createFailure.title'),
        message: error?.message || formatMessage('payroll.consolidation.createFailure.message'),
      });
    } finally {
      setIsCreating(false);
    }
  };
  return <>
    <SearcherActionButton
      onClick={() => setOpen(true)}
      startIcon={<AddIcon />}
      label={formatMessage('payroll.consolidation.create')}
      variant="contained"
      color="primary"
      size={buttonSize}
      className={buttonClassName}
      borderless={false}
    />
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
      <DialogTitle>{formatMessage('payroll.consolidation.title')}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <PublishedComponent
              pubRef="location.MwDistrictPicker"
              value={district}
              onChange={setDistrict}
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              withLabel
              required
              label="Phase"
              placeholder="Select a Phase"
              options={phases}
              value={benefitPlan}
              onChange={setBenefitPlan}
              onInputChange={() => {}}
              isLoading={phasesLoading}
              getOptionLabel={(phase) => `${phase.code} - ${phase.name}`}
            />
          </Grid>
          {phasesError && <Grid item xs={12}><Typography color="error">{String(phasesError)}</Typography></Grid>}
          {error && <Grid item xs={12}><Typography color="error">{String(error)}</Typography></Grid>}
        </Grid>
        <Table size="small"><TableHead><TableRow>
          <TableCell><Checkbox {...checkboxIcons} checked={allSelected} onChange={() => setSelected(allSelected ? [] : candidates.map((item) => item.id))} /></TableCell>
          <TableCell>{formatMessage('payroll.name')}</TableCell><TableCell>{formatMessage('payroll.summary.beneficiaries')}</TableCell><TableCell>{formatMessage('payroll.amount')}</TableCell>
        </TableRow></TableHead><TableBody>
          {candidates.map((item) => <TableRow key={item.id}>
            <TableCell><Checkbox {...checkboxIcons} checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /></TableCell>
            <TableCell>{item.name}</TableCell><TableCell>{item.benefitConsumption.length}</TableCell>
            <TableCell>{item.benefitConsumption.reduce((sum, benefit) => sum + Number(benefit.amount || 0), 0)}</TableCell>
          </TableRow>)}
        </TableBody></Table>
        {isLoading && <Typography>{formatMessage('payroll.consolidation.loading')}</Typography>}
        <Typography>{formatMessageWithValues('payroll.consolidation.selected', { count: selected.length, amount: total })}</Typography>
      </DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)} disabled={isCreating}>{formatMessage('payroll.summary.close')}</Button><Button color="primary" disabled={!selected.length || isCreating} onClick={create}>{formatMessage(isCreating ? 'payroll.consolidation.creating' : 'payroll.consolidation.confirm')}</Button></DialogActions>
    </Dialog>
  </>;
}
export default connect(null, (dispatch) => bindActionCreators({
  createConsolidatedPayroll,
  showPageFeedback,
  waitForMutation,
}, dispatch))(ConsolidatePayrollsDialog);
