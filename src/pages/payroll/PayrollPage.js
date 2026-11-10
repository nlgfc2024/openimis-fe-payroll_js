import React, { useState, useRef, useEffect } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { makeStyles } from '@material-ui/styles';

import {
  Form,
  useHistory,
  useModulesManager,
  useTranslations,
  coreAlert,
  coreConfirm,
  clearConfirm,
  journalize,
  waitForMutation,
  useGraphqlQuery,
} from '@openimis/fe-core';
import {
  fetchPayroll,
  clearPayroll,
  createPayroll,
  PAYMENT_POINT_PROJECTION,
} from '../../actions';
import {
  MODULE_NAME, PAYROLL_FROM_FAILED_INVOICES_URL_PARAM,
  RIGHT_PAYROLL_CREATE,
} from '../../constants';
import { ACTION_TYPE } from '../../reducer';
import { mutationLabel, pageTitle } from '../../utils/string-utils';
import {
  DEFAULT_PAYMENT_METHOD_CONFIG,
  DEFAULT_PAYMENT_PLAN_ID_CONFIG,
  DEFAULT_PAYMENT_POINT_ID_CONFIG,
  PAYROLL_CONFIG_MODULE,
} from '../../utils/payroll-ui-config';
import {
  getPaymentPlanBenefitPlanId,
  isPaymentPlanActive,
} from '../../utils/payroll-utils';
import PayrollHeadPanel from '../../components/payroll/PayrollHeadPanel';
import PayrollTab from '../../components/payroll/PayrollTab';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
}));

const showConfigurationAlert = (reportedErrors, coreAlert, formatMessage, key, message) => {
  if (reportedErrors.current.has(key)) return;
  reportedErrors.current.add(key);
  coreAlert(formatMessage('payroll.payroll.configurationError.title'), message);
};

function PayrollPage({
  statePayrollUuid,
  taskPayrollUuid,
  rights,
  confirmed,
  submittingMutation,
  mutation,
  payroll,
  fetchPayroll,
  createPayroll,
  clearPayroll,
  clearConfirm,
  coreAlert,
  waitForMutation,
  createPayrollFromFailedInvoices,
  journalize,
  benefitPlanId,
  paymentMethods = [],
  fetchedPaymentMethods,
  errorPaymentMethods,
}) {
  const modulesManager = useModulesManager();
  const classes = useStyles();
  const history = useHistory();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [editedPayroll, setEditedPayroll] = useState({});
  const [payrollUuid, setPayrollUuid] = useState(null);
  const [isInTask, setIsInTask] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [isPayrollFromFailedInvoices, setIsPayrollFromFailedInvoices] = useState(false);
  const [confirmedAction, setConfirmedAction] = useState(() => null);
  const prevSubmittingMutationRef = useRef();
  const reportedConfigurationErrorsRef = useRef(new Set());
  const appliedDefaultsRef = useRef(new Set());

  const defaultPaymentPlanId = modulesManager.getConf(
    PAYROLL_CONFIG_MODULE,
    DEFAULT_PAYMENT_PLAN_ID_CONFIG,
    null,
  );
  const defaultPaymentMethod = modulesManager.getConf(
    PAYROLL_CONFIG_MODULE,
    DEFAULT_PAYMENT_METHOD_CONFIG,
    null,
  );
  const defaultPaymentPointId = modulesManager.getConf(
    PAYROLL_CONFIG_MODULE,
    DEFAULT_PAYMENT_POINT_ID_CONFIG,
    null,
  );
  const isEditingExistingPayroll = !!(statePayrollUuid || taskPayrollUuid);
  const isCreatingFromFailedInvoices = (
    createPayrollFromFailedInvoices === PAYROLL_FROM_FAILED_INVOICES_URL_PARAM
  );
  const isNewPayroll = !isEditingExistingPayroll
    && !isCreatingFromFailedInvoices
    && !isPayrollFromFailedInvoices;
  const {
    data: defaultPaymentPlanData,
    error: defaultPaymentPlanError,
    isLoading: isLoadingDefaultPaymentPlan,
  } = useGraphqlQuery(
    `query ConfiguredDefaultPaymentPlan($id: ID!) {
      paymentPlan(id: $id) {
        edges {
          node { id code name benefitPlan isDeleted dateValidFrom dateValidTo }
        }
      }
    }`,
    { id: defaultPaymentPlanId },
    { skip: !defaultPaymentPlanId },
  );
  const defaultPaymentPlan = defaultPaymentPlanData?.paymentPlan?.edges?.[0]?.node;
  const defaultPaymentPlanBenefitPlanId = getPaymentPlanBenefitPlanId(defaultPaymentPlan);
  const isDefaultPaymentPlanValid = isPaymentPlanActive(defaultPaymentPlan)
    && (!benefitPlanId || defaultPaymentPlanBenefitPlanId === benefitPlanId);
  const {
    data: defaultPaymentPointData,
    error: defaultPaymentPointError,
    isLoading: isLoadingDefaultPaymentPoint,
  } = useGraphqlQuery(
    `query ConfiguredDefaultPaymentPoint($id: ID!) {
      paymentPoint(id: $id) {
        edges {
          node { ${PAYMENT_POINT_PROJECTION(modulesManager).join(' ')} }
        }
      }
    }`,
    { id: defaultPaymentPointId },
    { skip: !defaultPaymentPointId },
  );
  const configuredPaymentPoint = defaultPaymentPointData?.paymentPoint?.edges?.[0]?.node;
  const defaultPaymentPoint = configuredPaymentPoint?.isDeleted
    ? null
    : configuredPaymentPoint;
  const isDefaultPaymentPointValid = !!defaultPaymentPoint;
  const isDefaultPaymentMethodValid = !!defaultPaymentMethod
    && paymentMethods.some(({ name }) => name === defaultPaymentMethod);

  const back = () => history.goBack();

  useEffect(() => {
    setPayrollUuid(statePayrollUuid ?? taskPayrollUuid);
    setIsInTask(!!taskPayrollUuid);
    setReadOnly(false);
    setEditedPayroll({});
  }, [taskPayrollUuid, statePayrollUuid, benefitPlanId]);

  useEffect(() => {
    appliedDefaultsRef.current.clear();
  }, [isNewPayroll, benefitPlanId, statePayrollUuid, taskPayrollUuid]);

  useEffect(() => {
    if (!isNewPayroll) return;
    const configurationErrors = [
      {
        key: `paymentPlan:${defaultPaymentPlanId}:${benefitPlanId || ''}`,
        configured: !!defaultPaymentPlanId,
        error: defaultPaymentPlanError,
        loaded: !!defaultPaymentPlanData && !isLoadingDefaultPaymentPlan,
        valid: isDefaultPaymentPlanValid,
        message: 'payroll.payroll.defaultPaymentPlan.error',
      },
      {
        key: `paymentPoint:${defaultPaymentPointId}`,
        configured: !!defaultPaymentPointId,
        error: defaultPaymentPointError,
        loaded: !!defaultPaymentPointData && !isLoadingDefaultPaymentPoint,
        valid: isDefaultPaymentPointValid,
        message: 'payroll.payroll.defaultPaymentPoint.error',
      },
      {
        key: `paymentMethod:${defaultPaymentMethod}`,
        configured: !!defaultPaymentMethod,
        error: errorPaymentMethods,
        loaded: fetchedPaymentMethods,
        valid: isDefaultPaymentMethodValid,
        message: 'payroll.payroll.defaultPaymentMethod.error',
      },
    ];
    configurationErrors.forEach((configuration) => {
      if (!configuration.configured) return;
      if (configuration.error || (configuration.loaded && !configuration.valid)) {
        showConfigurationAlert(
          reportedConfigurationErrorsRef,
          coreAlert,
          formatMessage,
          configuration.key,
          configuration.error?.message || formatMessage(configuration.message),
        );
      }
    });
  }, [
    defaultPaymentPlanId,
    defaultPaymentPlanError,
    defaultPaymentPlanData,
    isLoadingDefaultPaymentPlan,
    isDefaultPaymentPlanValid,
    benefitPlanId,
    defaultPaymentPointId,
    defaultPaymentPointError,
    defaultPaymentPointData,
    isLoadingDefaultPaymentPoint,
    isDefaultPaymentPointValid,
    defaultPaymentMethod,
    errorPaymentMethods,
    fetchedPaymentMethods,
    isDefaultPaymentMethodValid,
    isNewPayroll,
    coreAlert,
    formatMessage,
  ]);

  useEffect(() => {
    if (!isNewPayroll) return;
    const defaults = [
      {
        field: 'paymentPlan',
        configured: !!defaultPaymentPlanId,
        ready: !!defaultPaymentPlanError || (!!defaultPaymentPlanData && !isLoadingDefaultPaymentPlan),
        valid: isDefaultPaymentPlanValid,
        value: defaultPaymentPlan,
      },
      {
        field: 'paymentMethod',
        configured: !!defaultPaymentMethod,
        ready: !!errorPaymentMethods || fetchedPaymentMethods,
        valid: isDefaultPaymentMethodValid,
        value: defaultPaymentMethod,
      },
      {
        field: 'paymentPoint',
        configured: !!defaultPaymentPointId,
        ready: !!defaultPaymentPointError || (!!defaultPaymentPointData && !isLoadingDefaultPaymentPoint),
        valid: isDefaultPaymentPointValid,
        value: defaultPaymentPoint,
      },
    ];
    const readyDefaults = defaults.filter((item) => (
      item.configured && item.ready && !appliedDefaultsRef.current.has(item.field)
    ));
    if (!readyDefaults.length) return;
    readyDefaults.forEach(({ field }) => appliedDefaultsRef.current.add(field));
    const validDefaults = readyDefaults.filter((item) => item.valid);
    if (!validDefaults.length) return;
    setEditedPayroll((current) => {
      const updates = {};
      validDefaults.forEach(({ field, value }) => {
        if (!current[field]) updates[field] = value;
      });
      return Object.keys(updates).length ? { ...current, ...updates } : current;
    });
  }, [
    defaultPaymentPlanId,
    defaultPaymentPlanError,
    defaultPaymentPlanData,
    isLoadingDefaultPaymentPlan,
    defaultPaymentPlan,
    isDefaultPaymentPlanValid,
    defaultPaymentMethod,
    errorPaymentMethods,
    fetchedPaymentMethods,
    isDefaultPaymentMethodValid,
    defaultPaymentPointId,
    defaultPaymentPointError,
    defaultPaymentPointData,
    isLoadingDefaultPaymentPoint,
    defaultPaymentPoint,
    isNewPayroll,
  ]);

  useEffect(() => {
    setIsPayrollFromFailedInvoices(
      createPayrollFromFailedInvoices === PAYROLL_FROM_FAILED_INVOICES_URL_PARAM,
    );
  }, [createPayrollFromFailedInvoices, payrollUuid]);

  useEffect(() => {
    if (payrollUuid) {
      fetchPayroll(modulesManager, [`id: "${payrollUuid}"`]);
    }
  }, [payrollUuid]);

  useEffect(() => {
    if (confirmed && typeof confirmed === 'function') confirmedAction();
    return () => confirmed && clearConfirm(null);
  }, [confirmed]);

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
      if (mutation?.actionType === ACTION_TYPE.CREATE_PAYROLL) {
        const showPayrollCreationResult = async () => {
          const result = await waitForMutation(mutation.clientMutationId);
          if (result?.status === 2) {
            coreAlert(
              formatMessage('payroll.payroll.taskCreated.title'),
              formatMessage('payroll.payroll.taskCreated.message'),
            );
            if (!payrollUuid || isPayrollFromFailedInvoices) {
              fetchPayroll(modulesManager, [`clientMutationId: "${mutation.clientMutationId}"`]);
              setIsPayrollFromFailedInvoices(false);
            }
            return;
          }

          const error = result?.error;
          const mutationError = Array.isArray(error) ? error[0] : error;
          coreAlert(
            formatMessage('payroll.payroll.creationFailed.title'),
            mutationError?.detail || mutationError?.message
              || formatMessage('payroll.payroll.creationFailed.message'),
          );
        };
        showPayrollCreationResult();
        return;
      }
      if (mutation?.actionType === ACTION_TYPE.DELETE_PAYROLL) {
        back();
      }
      if (mutation?.clientMutationId && (!payrollUuid || isPayrollFromFailedInvoices)) {
        fetchPayroll(modulesManager, [`clientMutationId: "${mutation.clientMutationId}"`]);
        setIsPayrollFromFailedInvoices(false);
      }
    }
  }, [submittingMutation]);

  useEffect(() => {
    prevSubmittingMutationRef.current = submittingMutation;
  });

  useEffect(() => {
    if (payroll) {
      setReadOnly(payroll?.id);
      if (isPayrollFromFailedInvoices) {
        setEditedPayroll({
          ...payroll, id: null, name: null, paymentCycle: null, status: null, fromFailedInvoicesPayrollId: payroll?.id,
        });
      } else {
        setEditedPayroll(payroll);
      }
      if (!payrollUuid && payroll?.id && !isPayrollFromFailedInvoices) {
        const payrollRouteRef = modulesManager.getRef('payroll.route.payroll');
        history.replace(`/${payrollRouteRef}/${payroll.id}`);
      }
    }
  }, [payroll]);

  useEffect(() => () => clearPayroll(), []);

  const mandatoryFieldsEmpty = () => {
    if (
      editedPayroll?.paymentPlan
      && editedPayroll?.paymentCycle
      && editedPayroll?.dateValidFrom
      && editedPayroll?.dateValidTo
      && editedPayroll?.paymentMethod
      && !editedPayroll?.isDeleted) return false;
    return true;
  };

  const canSave = () => !mandatoryFieldsEmpty() && (!readOnly || isPayrollFromFailedInvoices);

  const handleSave = () => {
    createPayroll(
      editedPayroll,
      formatMessageWithValues('payroll.mutation.create', mutationLabel(payroll)),
    );
    if (benefitPlanId) {
      back();
    }
  };

  const actions = [];

  return (
    rights.includes(RIGHT_PAYROLL_CREATE) && (
    <div className={classes.page}>
      <Form
        key={payrollUuid}
        module="payroll"
        title={formatMessageWithValues('payrollPage.title', pageTitle(payroll))}
        titleParams={pageTitle(payroll)}
        openDirty={isPayrollFromFailedInvoices ? true : !payrollUuid}
        benefitPlan={editedPayroll}
        edited={editedPayroll}
        onEditedChanged={setEditedPayroll}
        back={!isInTask && back}
        mandatoryFieldsEmpty={mandatoryFieldsEmpty}
        canSave={canSave}
        save={handleSave}
        HeadPanel={PayrollHeadPanel}
        Panels={[PayrollTab]}
        rights={rights}
        actions={actions}
        setConfirmedAction={setConfirmedAction}
        payrollUuid={payrollUuid}
        saveTooltip={formatMessage('tooltip.save')}
        isInTask={!!taskPayrollUuid}
        payroll={payroll}
        readOnly={readOnly}
        isPayrollFromFailedInvoices={isPayrollFromFailedInvoices}
        benefitPlanId={benefitPlanId}
        canHideDefaultPaymentPlan={!isNewPayroll || isDefaultPaymentPlanValid}
        canHideDefaultPaymentMethod={!isNewPayroll || isDefaultPaymentMethodValid}
        canHideDefaultPaymentPoint={!isNewPayroll || !defaultPaymentPointId || !!defaultPaymentPoint}
      />
    </div>
    )
  );
}

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchPayroll,
  createPayroll,
  clearPayroll,
  coreAlert,
  coreConfirm,
  clearConfirm,
  journalize,
  waitForMutation,
}, dispatch);

const mapStateToProps = (state, props) => ({
  statePayrollUuid: props?.match?.params?.payroll_uuid === 'null' ? null : props?.match?.params.payroll_uuid,
  createPayrollFromFailedInvoices: props?.match?.params?.createPayrollFromFailedInvoices,
  benefitPlanId: props?.match?.params?.benefitPlanId,
  rights: state.core?.user?.i_user?.rights ?? [],
  confirmed: state.core.confirmed,
  submittingMutation: state.payroll.submittingMutation,
  mutation: state.payroll.mutation,
  payroll: state.payroll.payroll,
  paymentMethods: state.payroll.paymentMethods,
  fetchedPaymentMethods: state.payroll.fetchedPaymentMethods,
  errorPaymentMethods: state.payroll.errorPaymentMethods,
});

export default connect(mapStateToProps, mapDispatchToProps)(PayrollPage);
