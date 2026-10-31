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
} from '../../utils/payroll-ui-config';
import PayrollHeadPanel from '../../components/payroll/PayrollHeadPanel';
import PayrollTab from '../../components/payroll/PayrollTab';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
}));

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

  const defaultPaymentPlanId = modulesManager.getConf(
    MODULE_NAME,
    DEFAULT_PAYMENT_PLAN_ID_CONFIG,
    null,
  );
  const defaultPaymentMethod = modulesManager.getConf(
    MODULE_NAME,
    DEFAULT_PAYMENT_METHOD_CONFIG,
    null,
  );
  const defaultPaymentPointId = modulesManager.getConf(
    MODULE_NAME,
    DEFAULT_PAYMENT_POINT_ID_CONFIG,
    null,
  );
  const isEditingExistingPayroll = !!(statePayrollUuid || taskPayrollUuid);
  const {
    data: defaultPaymentPlanData,
    error: defaultPaymentPlanError,
    isLoading: isLoadingDefaultPaymentPlan,
  } = useGraphqlQuery(
    `query ConfiguredDefaultPaymentPlan($id: ID!) {
      paymentPlan(id: $id) {
        edges {
          node { id code name benefitPlan }
        }
      }
    }`,
    { id: defaultPaymentPlanId },
    { skip: !defaultPaymentPlanId || isEditingExistingPayroll || isPayrollFromFailedInvoices },
  );
  const defaultPaymentPlan = defaultPaymentPlanData?.paymentPlan?.edges?.[0]?.node;

  const back = () => history.goBack();

  useEffect(() => {
    if (defaultPaymentPlanError) {
      coreAlert(
        formatMessage('payroll.payroll.creationFailed.title'),
        defaultPaymentPlanError.message
          || formatMessage('payroll.payroll.defaultPaymentPlan.error'),
      );
    } else if (
      defaultPaymentPlanId
      && defaultPaymentPlanData
      && !isLoadingDefaultPaymentPlan
      && !defaultPaymentPlan
    ) {
      coreAlert(
        formatMessage('payroll.payroll.creationFailed.title'),
        formatMessage('payroll.payroll.defaultPaymentPlan.error'),
      );
    }
  }, [
    defaultPaymentPlanError,
    defaultPaymentPlanId,
    defaultPaymentPlanData,
    isLoadingDefaultPaymentPlan,
    defaultPaymentPlan,
  ]);

  useEffect(() => {
    if (isEditingExistingPayroll || isPayrollFromFailedInvoices) return;
    setEditedPayroll((current) => ({
      ...current,
      ...(defaultPaymentPlan && !current.paymentPlan
        ? { paymentPlan: defaultPaymentPlan } : {}),
      ...(defaultPaymentMethod && !current.paymentMethod
        ? { paymentMethod: defaultPaymentMethod } : {}),
      ...(defaultPaymentPointId && !current.paymentPoint
        ? { paymentPoint: { id: defaultPaymentPointId } } : {}),
    }));
  }, [
    defaultPaymentPlan,
    defaultPaymentMethod,
    defaultPaymentPointId,
    isEditingExistingPayroll,
    isPayrollFromFailedInvoices,
  ]);

  useEffect(() => {
    if (createPayrollFromFailedInvoices === PAYROLL_FROM_FAILED_INVOICES_URL_PARAM) {
      setIsPayrollFromFailedInvoices(true);
    }
  }, [createPayrollFromFailedInvoices, payrollUuid]);

  useEffect(() => {
    setPayrollUuid(statePayrollUuid ?? taskPayrollUuid);
    setIsInTask(!!taskPayrollUuid);
  }, [taskPayrollUuid, statePayrollUuid]);

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
});

export default connect(mapStateToProps, mapDispatchToProps)(PayrollPage);
