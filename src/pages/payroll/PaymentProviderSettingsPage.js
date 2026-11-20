import React, { useEffect, useRef, useState } from 'react';
import { bindActionCreators } from 'redux';
import { connect, useSelector } from 'react-redux';
import {
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import {
  coreAlert,
  Helmet,
  journalize,
  useModulesManager,
  useTranslations,
  waitForMutation,
} from '@openimis/fe-core';
import {
  createPaymentProvider,
  createWithdrawalFeeBand,
  deleteWithdrawalFeeBand,
  fetchPaymentProviders,
  fetchWithdrawalFeeBands,
  updatePaymentProvider,
  updateWithdrawalFeeBand,
} from '../../actions';
import {
  MODULE_NAME,
  RIGHT_WITHDRAWAL_FEE_MANAGE,
} from '../../constants';
import { ACTION_TYPE } from '../../reducer';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  panel: {
    ...theme.paper.body,
    padding: 0,
    marginBottom: theme.spacing(2),
    boxShadow: theme.shadows[1],
  },
  panelHeader: {
    ...theme.paper.header,
    padding: theme.spacing(1, 2),
  },
  panelContent: {
    padding: theme.spacing(2),
  },
  sectionTitle: {
    color: theme.palette.primary.main,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
  },
  sectionDescription: {
    marginBottom: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
  formActions: {
    marginTop: theme.spacing(2),
  },
  feeBandForm: {
    marginBottom: theme.spacing(2),
  },
  feeBandActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing(1),
    [theme.breakpoints.down('sm')]: {
      justifyContent: 'flex-start',
    },
  },
  tableHead: {
    ...theme.table.header,
    backgroundColor: theme.paper.header.backgroundColor,
  },
  tableRow: theme.table.row,
  tableCell: theme.table.cell,
}));

const emptyProvider = {
  code: '',
  name: '',
  providerType: 'BANK',
  isActive: true,
};

const newFeeBand = () => ({
  minimumAmount: '',
  maximumAmount: '',
  transferCost: '',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
});

function PaymentProviderSettingsPage({
  providers,
  bands,
  fetchingProviders,
  fetchingBands,
  providersError,
  bandsError,
  mutation,
  submittingMutation,
  fetchPaymentProviders,
  fetchWithdrawalFeeBands,
  createPaymentProvider,
  updatePaymentProvider,
  createWithdrawalFeeBand,
  updateWithdrawalFeeBand,
  deleteWithdrawalFeeBand,
  waitForMutation,
  journalize,
  coreAlert,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [providerForm, setProviderForm] = useState(emptyProvider);
  const [bandForm, setBandForm] = useState(newFeeBand());
  const previousSubmittingRef = useRef(false);

  const selectedProvider = providers.find(({ id }) => id === selectedProviderId);

  useEffect(() => {
    if (!rights.includes(RIGHT_WITHDRAWAL_FEE_MANAGE)) return;
    fetchPaymentProviders();
  }, [rights.includes(RIGHT_WITHDRAWAL_FEE_MANAGE)]);

  useEffect(() => {
    setBandForm(newFeeBand());
    if (selectedProviderId) {
      fetchWithdrawalFeeBands(selectedProviderId);
    }
  }, [selectedProviderId]);

  useEffect(() => {
    if (!selectedProvider) {
      setProviderForm(emptyProvider);
      return;
    }
    setProviderForm({
      id: selectedProvider.id,
      code: selectedProvider.code,
      name: selectedProvider.name,
      providerType: selectedProvider.providerType,
      isActive: selectedProvider.isActive,
    });
  }, [selectedProviderId]);

  useEffect(() => {
    if (previousSubmittingRef.current && !submittingMutation) {
      journalize(mutation);
      if (mutation?.clientMutationId) {
        const refreshAfterMutation = async () => {
          const result = await waitForMutation(mutation.clientMutationId);
          if (result?.status === 2) {
            fetchPaymentProviders();
            if (selectedProviderId) fetchWithdrawalFeeBands(selectedProviderId);
            if (mutation?.actionType === ACTION_TYPE.CREATE_WITHDRAWAL_FEE_BAND
              || mutation?.actionType === ACTION_TYPE.UPDATE_WITHDRAWAL_FEE_BAND) {
              setBandForm(newFeeBand());
            }
            if (mutation?.actionType === ACTION_TYPE.CREATE_PAYMENT_PROVIDER
              || mutation?.actionType === ACTION_TYPE.UPDATE_PAYMENT_PROVIDER) {
              setProviderForm(emptyProvider);
            }
            return;
          }
          const error = Array.isArray(result?.error) ? result.error[0] : result?.error;
          coreAlert(
            formatMessage('payroll.withdrawalFees.error.title'),
            error?.detail || error?.message || formatMessage('payroll.withdrawalFees.error.message'),
          );
        };
        refreshAfterMutation();
      }
    }
    previousSubmittingRef.current = submittingMutation;
  }, [submittingMutation]);

  useEffect(() => {
    if (providersError) {
      coreAlert(
        formatMessage('payroll.withdrawalFees.error.title'),
        providersError.message || formatMessage('payroll.withdrawalFees.error.message'),
      );
    }
  }, [providersError]);

  useEffect(() => {
    if (bandsError) {
      coreAlert(
        formatMessage('payroll.withdrawalFees.error.title'),
        bandsError.message || formatMessage('payroll.withdrawalFees.error.message'),
      );
    }
  }, [bandsError]);

  if (!rights.includes(RIGHT_WITHDRAWAL_FEE_MANAGE)) return null;

  const handleProviderSubmit = () => {
    if (providerForm.id) {
      updatePaymentProvider(providerForm, formatMessage('payroll.withdrawalFees.provider.update'));
    } else {
      createPaymentProvider(providerForm, formatMessage('payroll.withdrawalFees.provider.create'));
    }
  };

  const handleBandSubmit = () => {
    const payload = {
      ...bandForm,
      providerId: selectedProviderId,
      maximumAmount: bandForm.maximumAmount || '',
      effectiveTo: bandForm.effectiveTo || null,
    };
    if (bandForm.id) {
      updateWithdrawalFeeBand(payload, formatMessage('payroll.withdrawalFees.band.update'));
    } else {
      createWithdrawalFeeBand(payload, formatMessage('payroll.withdrawalFees.band.create'));
    }
  };

  const editBand = (band) => setBandForm({
    id: band.id,
    minimumAmount: band.minimumAmount,
    maximumAmount: band.maximumAmount ?? '',
    transferCost: band.transferCost,
    effectiveFrom: band.effectiveFrom,
    effectiveTo: band.effectiveTo ?? '',
  });

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('payroll.withdrawalFees.title')} />
      <Paper className={classes.panel}>
        <div className={classes.panelHeader}>
          <Typography variant="h5" className={classes.sectionTitle}>
            {formatMessage('payroll.withdrawalFees.title')}
          </Typography>
        </div>
        <div className={classes.panelContent}>
          <Typography variant="body2" className={classes.sectionDescription}>
            {formatMessage('payroll.withdrawalFees.provider.listHelp')}
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{formatMessage('payroll.withdrawalFees.provider.select')}</InputLabel>
                <Select
                  value={selectedProviderId}
                  onChange={(event) => setSelectedProviderId(event.target.value)}
                  disabled={fetchingProviders}
                >
                  {providers.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {provider.name}
                      {provider.isActive ? '' : ` (${formatMessage('payroll.withdrawalFees.provider.inactive')})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Grid container spacing={2} className={classes.formActions}>
            <Grid item xs={12} sm={6} lg={3}>
              <TextField
                fullWidth
                label={formatMessage('payroll.withdrawalFees.provider.code')}
                value={providerForm.code}
                onChange={(event) => setProviderForm({ ...providerForm, code: event.target.value })}
                inputProps={{ maxLength: 64 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <TextField
                fullWidth
                label={formatMessage('payroll.withdrawalFees.provider.name')}
                value={providerForm.name}
                onChange={(event) => setProviderForm({ ...providerForm, name: event.target.value })}
                inputProps={{ maxLength: 255 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <FormControl fullWidth>
                <InputLabel>{formatMessage('payroll.withdrawalFees.provider.type')}</InputLabel>
                <Select
                  value={providerForm.providerType}
                  onChange={(event) => setProviderForm({ ...providerForm, providerType: event.target.value })}
                >
                  <MenuItem value="BANK">{formatMessage('payroll.withdrawalFees.provider.type.bank')}</MenuItem>
                  <MenuItem value="MOBILE_MONEY">
                    {formatMessage('payroll.withdrawalFees.provider.type.mobileMoney')}
                  </MenuItem>
                  <MenuItem value="OTHER">{formatMessage('payroll.withdrawalFees.provider.type.other')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <FormControl fullWidth>
                <InputLabel>{formatMessage('payroll.withdrawalFees.provider.status')}</InputLabel>
                <Select
                  value={providerForm.isActive ? 'active' : 'inactive'}
                  onChange={(event) => setProviderForm({
                    ...providerForm,
                    isActive: event.target.value === 'active',
                  })}
                >
                  <MenuItem value="active">{formatMessage('payroll.withdrawalFees.provider.active')}</MenuItem>
                  <MenuItem value="inactive">{formatMessage('payroll.withdrawalFees.provider.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button
                color="primary"
                variant="contained"
                onClick={handleProviderSubmit}
                disabled={!providerForm.code.trim() || !providerForm.name.trim() || submittingMutation}
              >
                {formatMessage(providerForm.id
                  ? 'payroll.withdrawalFees.provider.save'
                  : 'payroll.withdrawalFees.provider.add')}
              </Button>
              {providerForm.id && (
                <Button onClick={() => setProviderForm(emptyProvider)}>
                  {formatMessage('payroll.withdrawalFees.cancel')}
                </Button>
              )}
            </Grid>
          </Grid>
        </div>
      </Paper>

      {selectedProvider && (
        <Paper className={classes.panel}>
          <div className={classes.panelHeader}>
            <Typography variant="h6" className={classes.sectionTitle}>
              {`${selectedProvider.name} - ${formatMessage('payroll.withdrawalFees.bands.title')}`}
            </Typography>
          </div>
          <div className={classes.panelContent}>
            <Typography variant="body2" className={classes.sectionDescription}>
              {formatMessage('payroll.withdrawalFees.band.openEnded')}
            </Typography>
            <Grid container spacing={2} alignItems="flex-end" className={classes.feeBandForm}>
              <Grid item xs={12} sm={6} lg={4}>
                <TextField
                  fullWidth
                  type="number"
                  label={formatMessage('payroll.withdrawalFees.band.minimum')}
                  value={bandForm.minimumAmount}
                  onChange={(event) => setBandForm({ ...bandForm, minimumAmount: event.target.value })}
                  inputProps={{ min: 0, step: '0.01' }}
                  disabled={!selectedProvider.isActive}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <TextField
                  fullWidth
                  type="number"
                  label={formatMessage('payroll.withdrawalFees.band.maximum')}
                  value={bandForm.maximumAmount}
                  onChange={(event) => setBandForm({ ...bandForm, maximumAmount: event.target.value })}
                  inputProps={{ min: 0, step: '0.01' }}
                  disabled={!selectedProvider.isActive}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <TextField
                  fullWidth
                  type="number"
                  label={formatMessage('payroll.withdrawalFees.band.transferCost')}
                  value={bandForm.transferCost}
                  onChange={(event) => setBandForm({ ...bandForm, transferCost: event.target.value })}
                  inputProps={{ min: 0, step: '0.01' }}
                  disabled={!selectedProvider.isActive}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <TextField
                  fullWidth
                  type="date"
                  label={formatMessage('payroll.withdrawalFees.band.effectiveFrom')}
                  value={bandForm.effectiveFrom}
                  onChange={(event) => setBandForm({ ...bandForm, effectiveFrom: event.target.value })}
                  InputLabelProps={{ shrink: true }}
                  disabled={!selectedProvider.isActive}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <TextField
                  fullWidth
                  type="date"
                  label={formatMessage('payroll.withdrawalFees.band.effectiveTo')}
                  value={bandForm.effectiveTo}
                  onChange={(event) => setBandForm({ ...bandForm, effectiveTo: event.target.value })}
                  InputLabelProps={{ shrink: true }}
                  disabled={!selectedProvider.isActive}
                />
              </Grid>
              <Grid item xs={12} lg={6} className={classes.feeBandActions}>
                <Button
                  color="primary"
                  variant="contained"
                  onClick={handleBandSubmit}
                  disabled={
                    !bandForm.minimumAmount
                    || !bandForm.transferCost
                    || !bandForm.effectiveFrom
                    || !selectedProvider.isActive
                    || fetchingBands
                    || submittingMutation
                  }
                >
                  {formatMessage(bandForm.id
                    ? 'payroll.withdrawalFees.band.save'
                    : 'payroll.withdrawalFees.band.add')}
                </Button>
                {bandForm.id && (
                  <Button onClick={() => setBandForm(newFeeBand())}>
                    {formatMessage('payroll.withdrawalFees.cancel')}
                  </Button>
                )}
              </Grid>
            </Grid>
            <Table size="small">
              <TableHead className={classes.tableHead}>
                <TableRow>
                  <TableCell className={classes.tableCell}>
                    {formatMessage('payroll.withdrawalFees.band.minimum')}
                  </TableCell>
                  <TableCell className={classes.tableCell}>
                    {formatMessage('payroll.withdrawalFees.band.maximum')}
                  </TableCell>
                  <TableCell className={classes.tableCell}>
                    {formatMessage('payroll.withdrawalFees.band.transferCost')}
                  </TableCell>
                  <TableCell className={classes.tableCell}>
                    {formatMessage('payroll.withdrawalFees.band.effectiveFrom')}
                  </TableCell>
                  <TableCell className={classes.tableCell}>
                    {formatMessage('payroll.withdrawalFees.band.effectiveTo')}
                  </TableCell>
                  <TableCell className={classes.tableCell} />
                </TableRow>
              </TableHead>
              <TableBody>
                {bands.map((band) => (
                  <TableRow key={band.id} className={classes.tableRow}>
                    <TableCell className={classes.tableCell}>{`MWK ${band.minimumAmount}`}</TableCell>
                    <TableCell className={classes.tableCell}>
                      {band.maximumAmount ? `MWK ${band.maximumAmount}` : '-'}
                    </TableCell>
                    <TableCell className={classes.tableCell}>{`MWK ${band.transferCost}`}</TableCell>
                    <TableCell className={classes.tableCell}>{band.effectiveFrom}</TableCell>
                    <TableCell className={classes.tableCell}>{band.effectiveTo || '-'}</TableCell>
                    <TableCell className={classes.tableCell}>
                      <Button
                        onClick={() => editBand(band)}
                        disabled={!selectedProvider.isActive}
                      >
                        {formatMessage('payroll.withdrawalFees.edit')}
                      </Button>
                      <Button
                        color="secondary"
                        onClick={() => deleteWithdrawalFeeBand(
                          band,
                          formatMessage('payroll.withdrawalFees.band.delete'),
                        )}
                        disabled={submittingMutation}
                      >
                        {formatMessage('payroll.withdrawalFees.delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!fetchingBands && bands.length === 0 && (
                  <TableRow>
                    <TableCell className={classes.tableCell} colSpan={6}>
                      {formatMessage('payroll.withdrawalFees.band.empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Paper>
      )}
    </div>
  );
}

const mapStateToProps = (state) => ({
  providers: state.payroll.paymentProviders,
  bands: state.payroll.withdrawalFeeBands,
  fetchingProviders: state.payroll.fetchingPaymentProviders,
  fetchingBands: state.payroll.fetchingWithdrawalFeeBands,
  providersError: state.payroll.errorPaymentProviders,
  bandsError: state.payroll.errorWithdrawalFeeBands,
  mutation: state.payroll.mutation,
  submittingMutation: state.payroll.submittingMutation,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchPaymentProviders,
  fetchWithdrawalFeeBands,
  createPaymentProvider,
  updatePaymentProvider,
  createWithdrawalFeeBand,
  updateWithdrawalFeeBand,
  deleteWithdrawalFeeBand,
  waitForMutation,
  journalize,
  coreAlert,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PaymentProviderSettingsPage);
