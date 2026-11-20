import React, { useEffect, useRef, useState } from 'react';
import { bindActionCreators } from 'redux';
import { connect, useSelector } from 'react-redux';
import {
  Button,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import {
  coreAlert,
  coreConfirm,
  clearConfirm,
  formatGQLString,
  Helmet,
  journalize,
  Searcher,
  useModulesManager,
  useTranslations,
  waitForMutation,
} from '@openimis/fe-core';
import {
  deleteWithdrawalFeeBand,
  fetchPaymentProviders,
  fetchWithdrawalFeeBands,
  savePaymentProviderWithFeeBand,
  updatePaymentProvider,
} from '../../actions';
import {
  DEFAULT_PAGE_SIZE,
  MODULE_NAME,
  RIGHT_WITHDRAWAL_FEE_MANAGE,
  ROWS_PER_PAGE_OPTIONS,
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
  actionButtons: {
    display: 'inline-flex',
    whiteSpace: 'nowrap',
  },
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
  bandsPageInfo,
  bandsTotalCount,
  fetchingProviders,
  fetchingBands,
  fetchedBands,
  providersError,
  bandsError,
  mutation,
  submittingMutation,
  fetchPaymentProviders,
  fetchWithdrawalFeeBands,
  savePaymentProviderWithFeeBand,
  updatePaymentProvider,
  deleteWithdrawalFeeBand,
  waitForMutation,
  journalize,
  coreAlert,
  coreConfirm,
  clearConfirm,
  confirmed,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const amountLocale = modulesManager.getConf('fe-core', 'thousandSeparator', 'en');
  const amountDecimals = modulesManager.getConf('fe-core', 'numberOfDecimals', 2);
  const formatFeeAmount = (amount) => {
    if (!amountLocale) return Number(amount).toFixed(amountDecimals);

    return new Intl.NumberFormat(amountLocale, {
      minimumFractionDigits: amountDecimals,
      maximumFractionDigits: amountDecimals,
    }).format(amount || 0);
  };
  const rights = useSelector((store) => store.core.user.i_user.rights ?? []);
  const [providerForm, setProviderForm] = useState(emptyProvider);
  const [providerFormOpen, setProviderFormOpen] = useState(false);
  const [bandForm, setBandForm] = useState(newFeeBand());
  const [bandSearcherKey, setBandSearcherKey] = useState(0);
  const [bandToDelete, setBandToDelete] = useState(null);
  const previousSubmittingRef = useRef(false);

  useEffect(() => {
    if (!rights.includes(RIGHT_WITHDRAWAL_FEE_MANAGE)) return;
    fetchPaymentProviders();
  }, [rights.includes(RIGHT_WITHDRAWAL_FEE_MANAGE)]);

  useEffect(() => {
    if (previousSubmittingRef.current && !submittingMutation) {
      journalize(mutation);
      if (mutation?.clientMutationId) {
        const refreshAfterMutation = async () => {
          const result = await waitForMutation(mutation.clientMutationId);
          if (result?.status === 2) {
            fetchPaymentProviders();
            setBandSearcherKey((key) => key + 1);
            if ([ACTION_TYPE.SAVE_PROVIDER_WITH_FEE_BAND, ACTION_TYPE.UPDATE_PAYMENT_PROVIDER]
              .includes(mutation?.actionType)) {
              setProviderForm(emptyProvider);
              setBandForm(newFeeBand());
              setProviderFormOpen(false);
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
    if (!bandToDelete) return;
    coreConfirm(
      formatMessage('payroll.withdrawalFees.band.delete.confirm.title'),
      formatMessage('payroll.withdrawalFees.band.delete.confirm.message'),
      null,
      'warning',
    );
  }, [bandToDelete]);

  useEffect(() => {
    if (!bandToDelete) return undefined;
    if (confirmed) {
      deleteWithdrawalFeeBand(
        bandToDelete,
        formatMessage('payroll.withdrawalFees.band.delete'),
      );
    }
    if (confirmed !== null) setBandToDelete(null);
    return () => confirmed && clearConfirm(false);
  }, [confirmed]);

  if (!rights.includes(RIGHT_WITHDRAWAL_FEE_MANAGE)) return null;

  const selectFormProvider = (event) => {
    const provider = providers.find(({ id }) => id === event.target.value);
    setProviderForm(provider ? {
      id: provider.id,
      code: provider.code,
      name: provider.name,
      providerType: provider.providerType,
      isActive: provider.isActive,
    } : emptyProvider);
    setBandForm(newFeeBand());
  };

  const addProvider = () => {
    setProviderForm(emptyProvider);
    setBandForm(newFeeBand());
    setProviderFormOpen(true);
  };

  const handleProviderSubmit = () => {
    if (!providerForm.code.trim() || !providerForm.name.trim()) {
      coreAlert(
        formatMessage('payroll.withdrawalFees.error.title'),
        formatMessage('payroll.withdrawalFees.provider.required'),
      );
      return;
    }
    if (!providerForm.isActive && providerForm.id) {
      updatePaymentProvider(
        providerForm,
        formatMessage('payroll.withdrawalFees.provider.update'),
      );
      return;
    }
    if (
      bandForm.minimumAmount === ''
      || bandForm.minimumAmount == null
      || bandForm.transferCost === ''
      || bandForm.transferCost == null
      || !bandForm.effectiveFrom
    ) {
      coreAlert(
        formatMessage('payroll.withdrawalFees.error.title'),
        formatMessage('payroll.withdrawalFees.band.required'),
      );
      return;
    }
    savePaymentProviderWithFeeBand(
      providerForm,
      bandForm,
      formatMessage(providerForm.id
        ? 'payroll.withdrawalFees.provider.saveWithBand'
        : 'payroll.withdrawalFees.provider.createWithBand'),
    );
  };

  const providerTitle = () => {
    if (providerForm.id && !providerForm.isActive) return 'payroll.withdrawalFees.provider.update';
    if (providerForm.id) return 'payroll.withdrawalFees.provider.updateWithBandTitle';
    return 'payroll.withdrawalFees.provider.createWithBandTitle';
  };

  const providerSubmitLabel = () => {
    if (providerForm.id && !providerForm.isActive) return 'payroll.withdrawalFees.provider.save';
    if (providerForm.id) return 'payroll.withdrawalFees.provider.saveWithBand';
    return 'payroll.withdrawalFees.provider.createWithBand';
  };

  const editBand = (band) => {
    setProviderForm({
      id: band.provider?.id,
      code: band.provider?.code ?? '',
      name: band.provider?.name ?? '',
      providerType: band.provider?.providerType ?? 'BANK',
      isActive: band.provider?.isActive ?? true,
    });
    setBandForm({
      id: band.id,
      minimumAmount: band.minimumAmount,
      maximumAmount: band.maximumAmount ?? '',
      transferCost: band.transferCost,
      effectiveFrom: band.effectiveFrom,
      effectiveTo: band.effectiveTo ?? '',
    });
    setProviderFormOpen(true);
  };

  const fetchBands = (params) => fetchWithdrawalFeeBands(params);
  const searcherActions = () => [{
    label: formatMessage('payroll.withdrawalFees.provider.add'),
    icon: <AddIcon />,
    authorized: true,
    onClick: addProvider,
    variant: 'contained',
  }];
  const feeBandFilter = ({ filters, onChangeFilters }) => (
    <Grid container spacing={1}>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label={formatMessage('payroll.withdrawalFees.provider.name')}
          value={filters?.providerName?.value ?? ''}
          onChange={(event) => {
            const { value } = event.target;
            onChangeFilters([{
              id: 'providerName',
              value: value || null,
              filter: value ? `providerName: "${formatGQLString(value)}"` : null,
            }]);
          }}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label={formatMessage('payroll.withdrawalFees.provider.code')}
          value={filters?.providerCode?.value ?? ''}
          onChange={(event) => {
            const { value } = event.target;
            onChangeFilters([{
              id: 'providerCode',
              value: value || null,
              filter: value ? `providerCode: "${formatGQLString(value)}"` : null,
            }]);
          }}
        />
      </Grid>
    </Grid>
  );
  const headers = () => [
    'withdrawalFees.provider.name',
    'withdrawalFees.provider.code',
    'withdrawalFees.band.minimum',
    'withdrawalFees.band.maximum',
    'withdrawalFees.band.transferCost',
    'withdrawalFees.band.effectiveFrom',
    'withdrawalFees.band.effectiveTo',
    'emptyLabel',
  ];
  const itemFormatters = () => [
    (band) => band.provider?.name ?? '',
    (band) => band.provider?.code ?? '',
    (band) => formatFeeAmount(band.minimumAmount),
    (band) => (band.maximumAmount !== '' && band.maximumAmount != null
      ? formatFeeAmount(band.maximumAmount)
      : '-'),
    (band) => formatFeeAmount(band.transferCost),
    (band) => band.effectiveFrom,
    (band) => band.effectiveTo || '-',
    (band) => (
      <span className={classes.actionButtons}>
        <Tooltip title={formatMessage('payroll.withdrawalFees.edit')}>
          <span>
            <IconButton
              aria-label={formatMessage('payroll.withdrawalFees.edit')}
              onClick={() => editBand(band)}
              disabled={!band.provider?.isActive}
            >
              <EditIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={formatMessage('payroll.withdrawalFees.delete')}>
          <span>
            <IconButton
              aria-label={formatMessage('payroll.withdrawalFees.delete')}
              onClick={() => setBandToDelete(band)}
              disabled={submittingMutation}
            >
              <DeleteIcon />
            </IconButton>
          </span>
        </Tooltip>
      </span>
    ),
  ];
  const rowIdentifier = (band) => band.id;

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('payroll.withdrawalFees.title')} />
      {providerFormOpen && (
        <Paper className={classes.panel}>
          <div className={classes.panelHeader}>
            <Typography variant="h5" className={classes.sectionTitle}>
              {formatMessage(providerTitle())}
            </Typography>
          </div>
          <div className={classes.panelContent}>
            <Typography variant="body2" className={classes.sectionDescription}>
              {formatMessage('payroll.withdrawalFees.provider.listHelp')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>{formatMessage('payroll.withdrawalFees.provider.selectExisting')}</InputLabel>
                  <Select
                    value={providerForm.id ?? ''}
                    onChange={selectFormProvider}
                    disabled={fetchingProviders || !!bandForm.id}
                  >
                    <MenuItem value="">{formatMessage('payroll.withdrawalFees.provider.new')}</MenuItem>
                    {providers.map((provider) => (
                      <MenuItem key={provider.id} value={provider.id}>
                        {`${provider.name} (${provider.code})`}
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
              <Grid item xs={12} sm={6} lg={4}>
                <TextField
                  fullWidth
                  type="number"
                  label={formatMessage('payroll.withdrawalFees.band.minimum')}
                  value={bandForm.minimumAmount}
                  onChange={(event) => setBandForm({ ...bandForm, minimumAmount: event.target.value })}
                  inputProps={{ min: 0, step: '0.01' }}
                  disabled={!providerForm.isActive}
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
                  disabled={!providerForm.isActive}
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
                  disabled={!providerForm.isActive}
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
                  disabled={!providerForm.isActive}
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
                  disabled={!providerForm.isActive}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  color="primary"
                  variant="contained"
                  onClick={handleProviderSubmit}
                  disabled={submittingMutation}
                >
                  {formatMessage(providerSubmitLabel())}
                </Button>
                <Button onClick={() => {
                  setProviderForm(emptyProvider);
                  setBandForm(newFeeBand());
                  setProviderFormOpen(false);
                }}
                >
                  {formatMessage('payroll.withdrawalFees.cancel')}
                </Button>
              </Grid>
            </Grid>
          </div>
        </Paper>
      )}

      {!providerFormOpen && (
        <Searcher
          key={bandSearcherKey}
          module={MODULE_NAME}
          FilterPane={feeBandFilter}
          fetch={fetchBands}
          items={bands}
          itemsPageInfo={bandsPageInfo}
          fetchingItems={fetchingBands}
          fetchedItems={fetchedBands}
          errorItems={bandsError}
          tableTitle={formatMessageWithValues(
            'payroll.withdrawalFees.band.searcherResultsTitle',
            { withdrawalFeeBandsTotalCount: bandsTotalCount },
          )}
          headers={headers}
          itemFormatters={itemFormatters}
          rowIdentifier={rowIdentifier}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          defaultPageSize={DEFAULT_PAGE_SIZE}
          enableActionButtons
          searcherActionsPosition="header-right"
          searcherActions={searcherActions()}
        />
      )}
    </div>
  );
}

const mapStateToProps = (state) => ({
  providers: state.payroll.paymentProviders,
  bands: state.payroll.withdrawalFeeBands,
  bandsPageInfo: state.payroll.withdrawalFeeBandsPageInfo,
  bandsTotalCount: state.payroll.withdrawalFeeBandsTotalCount,
  fetchingProviders: state.payroll.fetchingPaymentProviders,
  fetchedBands: state.payroll.fetchedWithdrawalFeeBands,
  fetchingBands: state.payroll.fetchingWithdrawalFeeBands,
  providersError: state.payroll.errorPaymentProviders,
  bandsError: state.payroll.errorWithdrawalFeeBands,
  mutation: state.payroll.mutation,
  submittingMutation: state.payroll.submittingMutation,
  confirmed: state.core.confirmed,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchPaymentProviders,
  fetchWithdrawalFeeBands,
  savePaymentProviderWithFeeBand,
  updatePaymentProvider,
  deleteWithdrawalFeeBand,
  waitForMutation,
  journalize,
  coreAlert,
  coreConfirm,
  clearConfirm,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PaymentProviderSettingsPage);
