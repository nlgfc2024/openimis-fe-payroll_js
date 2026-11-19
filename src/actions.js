/* eslint-disable max-len */
import {
  decodeId,
  formatGQLString,
  formatMutation,
  formatPageQueryWithCount,
  formatQuery,
  graphql,
  graphqlWithVariables,
} from '@openimis/fe-core';

import { ACTION_TYPE, MUTATION_SERVICE } from './reducer';
import {
  CLEAR, ERROR, REQUEST, SUCCESS,
} from './utils/action-type';
import { isBase64Encoded } from './utils/advanced-filters-utils';
import { PAYROLL_STATUS } from './constants';

export const PAYMENT_POINT_PROJECTION = (modulesManager) => [
  'id',
  'name',
  'isDeleted',
  `location ${modulesManager.getProjection('location.Location.FlatProjection')}`,
  `ppm ${modulesManager.getProjection('admin.UserPicker.projection')}`,
];

const BENEFIT_CONSUMPTION_PROJECTION = () => [
  'id',
  'isDeleted',
  'jsonExt',
  'dateCreated',
  'dateUpdated',
  'dateValidFrom',
  'dateValidTo',
  'id',
  'code',
  'individual {firstName, lastName}',
  'nationalId',
  'formNumber',
  'phoneNumber',
  'gender',
  'accountNumber',
  'accountName',
  'bank',
  'districtName',
  'traditionalAuthorityName',
  'groupVillageHeadName',
  'catchmentName',
  'projectName',
  'benefitAttachment {bill {id, code, terms, datePayed}}',
  'hasReceipt',
  'photo',
  'amount',
  'withdrawalFee',
  'withdrawalFeeError',
  'amountToPay',
  'type',
  'status',
  'dateDue',
];

const PAYROLL_BENEFIT_CONSUMPTION_PROJECTION = () => [
  'id',
  // eslint-disable-next-line max-len
  'benefit{id,isDeleted,jsonExt,dateCreated,dateUpdated,dateValidFrom,dateValidTo,id,code,individual {firstName, lastName},gender,accountNumber,accountName,bank,benefitAttachment {bill {id, code, terms, datePayed}},hasReceipt,photo,amount,withdrawalFee,withdrawalFeeError,amountToPay,type,status,dateDue}',
  'payroll {id, name, status, paymentCycle {code, startDate, endDate}, paymentMethod, benefitPlanNameCode}',
];

const BENEFIT_CONSUMPTION_SUMMARY_PROJECTION = () => [
  'totalAmountReceived', 'totalAmountDue',
];

const BENEFIT_ATTACHMENT_PROJECTION = () => [
  // Location fields are resolved by the payroll API from the beneficiary's village hierarchy.
  'benefit{id, status, code, dateDue, hasReceipt, nationalId, formNumber, phoneNumber, gender, accountNumber, accountName, bank, districtName, traditionalAuthorityName, groupVillageHeadName, catchmentName, projectName, individual {firstName, lastName}, jsonExt, type, status, amount, withdrawalFee, withdrawalFeeError, amountToPay}',
  'bill{id, code, terms, amountTotal, datePayed}',
];

const PAYROLL_PROJECTION = (modulesManager) => [
  'id',
  'payrollType',
  'name',
  'paymentMethod',
  'paymentPlan { code, id, name, benefitPlan }',
  `paymentPoint { ${PAYMENT_POINT_PROJECTION(modulesManager).join(' ')} }`,
  'paymentCycle { code, startDate, endDate }',
  // eslint-disable-next-line max-len
  'benefitConsumption{id, status, code, dateDue, hasReceipt, amount, individual {firstName, lastName}, benefitAttachment{bill{id, code, terms, amountTotal}}}',
  'jsonExt',
  'status',
  'dateValidFrom',
  'dateValidTo',
  'isDeleted',
];

const PAYROLL_SEARCHER_PROJECTION = (modulesManager) => [
  'id',
  'payrollType',
  'name',
  'paymentMethod',
  'paymentPlan { code, id, name, benefitPlan }',
  `paymentPoint { ${PAYMENT_POINT_PROJECTION(modulesManager).join(' ')} }`,
  'paymentCycle { code, startDate, endDate }',
  'jsonExt',
  'status',
  'dateValidFrom',
  'dateValidTo',
  'isDeleted',
];

const CSV_RECONCILIATION_PROJECTION = () => [
  "id",
  "fileName",
  "status",
  "dateCreated",
  "totalRecords",
  "matchedRecords",
  "paidRecords",
  "unpaidRecords",
  "unmatchedRecords",
  "duplicateOf { id fileName status }",
  "reviewTaskId",
  "reviewTaskStatus",
  "error",
  "jsonExt",
];

const RECONCILIATION_UPLOAD_ROW_PROJECTION = () => [
  'id', 'rowNumber', 'code', 'nationalId', 'status', 'submittedData', 'mismatchReasons',
];

const PAYMENT_METHOD_PROJECTION = () => [
  'paymentMethods {name}',
];

const formatPaymentPointGQL = (paymentPoint) => `
  ${paymentPoint?.id ? `id: "${paymentPoint.id}"` : ''}
  ${paymentPoint?.name ? `name: "${formatGQLString(paymentPoint.name)}"` : ''}
  ${paymentPoint?.location ? `locationId: ${decodeId(paymentPoint.location.id)}` : ''}
  ${paymentPoint?.ppm ? `ppmId: "${decodeId(paymentPoint.ppm.id)}"` : ''}
  `;

const formatPayrollGQL = (payroll) => `
  ${payroll?.id ? `id: "${payroll.id}"` : ''}
  ${payroll?.name ? `name: "${formatGQLString(payroll.name)}"` : ''}
  ${payroll?.paymentPoint ? `paymentPointId: "${decodeId(payroll.paymentPoint.id)}"` : ''}
  ${payroll?.paymentPlan ? `paymentPlanId: "${decodeId(payroll.paymentPlan.id)}"` : ''}
  ${payroll?.paymentCycle ? `paymentCycleId: "${decodeId(payroll.paymentCycle.id)}"` : ''}
  ${payroll?.paymentMethod ? `paymentMethod: "${payroll.paymentMethod}"` : ''}
  ${`status: ${PAYROLL_STATUS.PENDING_APPROVAL}`}
  ${
  payroll?.jsonExt
    ? `jsonExt: ${JSON.stringify(payroll.jsonExt)}`
    : ''
}
  ${
  payroll?.dateValidFrom
    ? `dateValidFrom: "${payroll.dateValidFrom}"`
    : ''
}
  ${
  payroll?.dateValidTo
    ? `dateValidTo: "${payroll.dateValidTo}"`
    : ''
}
  ${
  payroll?.fromFailedInvoicesPayrollId
    ? `fromFailedInvoicesPayrollId: "${payroll.fromFailedInvoicesPayrollId}"`
    : ''
}
  `;

const PERFORM_MUTATION = (mutationType, mutationInput, ACTION, clientMutationLabel) => {
  const mutation = formatMutation(mutationType, mutationInput, clientMutationLabel);
  const requestedDateTime = new Date();
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(ACTION), ERROR(ACTION_TYPE.MUTATION)],
    {
      actionType: ACTION,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime,
    },
  );
};

export function fetchPaymentPoints(modulesManager, params) {
  const payload = formatPageQueryWithCount('paymentPoint', params, PAYMENT_POINT_PROJECTION(modulesManager));
  return graphql(payload, ACTION_TYPE.SEARCH_PAYMENT_POINTS);
}

export function fetchPaymentPoint(modulesManager, params) {
  const payload = formatPageQueryWithCount('paymentPoint', params, PAYMENT_POINT_PROJECTION(modulesManager));
  return graphql(payload, ACTION_TYPE.GET_PAYMENT_POINT);
}

export function fetchPayrollPaymentFiles(modulesManager, params) {
  const payload = formatPageQueryWithCount('csvReconciliationUpload', params, CSV_RECONCILIATION_PROJECTION());
  return graphql(payload, ACTION_TYPE.GET_PAYROLL_PAYMENT_FILES);
}

export function fetchReconciliationUploadRows(uploadId) {
  // Task payloads store the database UUID, while GraphQL list rows expose a
  // Relay ID. Support both so a reviewer can open the uploaded beneficiaries
  // directly from a reconciliation task.
  const resolvedUploadId = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(uploadId)
    ? uploadId
    : decodeId(uploadId);
  const payload = formatPageQueryWithCount(
    'reconciliationUploadRow',
    [`first: 100`, `upload_Id: "${resolvedUploadId}"`, 'isDeleted: false', 'orderBy: "rowNumber"'],
    RECONCILIATION_UPLOAD_ROW_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.GET_RECONCILIATION_UPLOAD_ROWS);
}

export const clearPaymentPoint = () => (dispatch) => {
  dispatch({
    type: CLEAR(ACTION_TYPE.GET_PAYMENT_POINT),
  });
};

export function deletePaymentPoint(paymentPoint, clientMutationLabel) {
  const paymentPointUuids = `ids: ["${paymentPoint?.id}"]`;
  return PERFORM_MUTATION(
    MUTATION_SERVICE.PAYMENT_POINT.DELETE,
    paymentPointUuids,
    ACTION_TYPE.DELETE_PAYMENT_POINT,
    clientMutationLabel,
  );
}

export function createPaymentPoint(paymentPoint, clientMutationLabel) {
  return PERFORM_MUTATION(
    MUTATION_SERVICE.PAYMENT_POINT.CREATE,
    formatPaymentPointGQL(paymentPoint),
    ACTION_TYPE.CREATE_PAYMENT_POINT,
    clientMutationLabel,
  );
}

export function updatePaymentPoint(paymentPoint, clientMutationLabel) {
  return PERFORM_MUTATION(
    MUTATION_SERVICE.PAYMENT_POINT.UPDATE,
    formatPaymentPointGQL(paymentPoint),
    ACTION_TYPE.UPDATE_PAYMENT_POINT,
    clientMutationLabel,
  );
}

const formatPaymentProviderGQL = (provider) => `
  ${provider?.id ? `id: "${provider.id}"` : ''}
  ${provider?.code ? `code: "${formatGQLString(provider.code)}"` : ''}
  ${provider?.name ? `name: "${formatGQLString(provider.name)}"` : ''}
  ${provider?.providerType ? `providerType: "${provider.providerType}"` : ''}
  ${provider?.isActive !== undefined ? `isActive: ${provider.isActive}` : ''}
`;

const formatWithdrawalFeeBandGQL = (band) => `
  ${band?.id ? `id: "${band.id}"` : ''}
  ${band?.providerId ? `providerId: "${band.providerId}"` : ''}
  ${band?.minimumAmount !== undefined
    ? `minimumAmount: "${formatGQLString(String(band.minimumAmount))}"`
    : ''}
  ${band?.maximumAmount !== undefined
    ? `maximumAmount: ${band.maximumAmount === ''
      ? 'null'
      : `"${formatGQLString(String(band.maximumAmount))}"`}`
    : ''}
  ${band?.transferCost !== undefined
    ? `transferCost: "${formatGQLString(String(band.transferCost))}"`
    : ''}
  ${band?.effectiveFrom ? `effectiveFrom: "${band.effectiveFrom}"` : ''}
  ${band?.effectiveTo !== undefined
    ? `effectiveTo: ${band.effectiveTo ? `"${band.effectiveTo}"` : 'null'}`
    : ''}
`;

export function fetchPaymentProviders() {
  const payload = `
    query PaymentProviders {
      paymentProviders(activeOnly: false) {
        id
        code
        name
        providerType
        isActive
        isDeleted
      }
    }
  `;
  return graphql(payload, ACTION_TYPE.GET_PAYMENT_PROVIDERS);
}

export function fetchWithdrawalFeeBands(providerId) {
  const payload = `
    query WithdrawalFeeBands($providerId: UUID) {
      withdrawalFeeBands(providerId: $providerId) {
        id
        minimumAmount
        maximumAmount
        transferCost
        effectiveFrom
        effectiveTo
        provider { id code name }
      }
    }
  `;
  return graphqlWithVariables(payload, { providerId }, ACTION_TYPE.GET_WITHDRAWAL_FEE_BANDS);
}

export function createPaymentProvider(provider, clientMutationLabel) {
  return PERFORM_MUTATION(
    MUTATION_SERVICE.WITHDRAWAL_FEES.CREATE_PROVIDER,
    formatPaymentProviderGQL(provider),
    ACTION_TYPE.CREATE_PAYMENT_PROVIDER,
    clientMutationLabel,
  );
}

export function updatePaymentProvider(provider, clientMutationLabel) {
  return PERFORM_MUTATION(
    MUTATION_SERVICE.WITHDRAWAL_FEES.UPDATE_PROVIDER,
    formatPaymentProviderGQL(provider),
    ACTION_TYPE.UPDATE_PAYMENT_PROVIDER,
    clientMutationLabel,
  );
}

export function createWithdrawalFeeBand(band, clientMutationLabel) {
  return PERFORM_MUTATION(
    MUTATION_SERVICE.WITHDRAWAL_FEES.CREATE_BAND,
    formatWithdrawalFeeBandGQL(band),
    ACTION_TYPE.CREATE_WITHDRAWAL_FEE_BAND,
    clientMutationLabel,
  );
}

export function updateWithdrawalFeeBand(band, clientMutationLabel) {
  return PERFORM_MUTATION(
    MUTATION_SERVICE.WITHDRAWAL_FEES.UPDATE_BAND,
    formatWithdrawalFeeBandGQL(band),
    ACTION_TYPE.UPDATE_WITHDRAWAL_FEE_BAND,
    clientMutationLabel,
  );
}

export function deleteWithdrawalFeeBand(band, clientMutationLabel) {
  return PERFORM_MUTATION(
    MUTATION_SERVICE.WITHDRAWAL_FEES.DELETE_BAND,
    `id: "${band?.id}"`,
    ACTION_TYPE.DELETE_WITHDRAWAL_FEE_BAND,
    clientMutationLabel,
  );
}

export function fetchPayrolls(modulesManager, params) {
  const payload = formatPageQueryWithCount('payroll', params, PAYROLL_SEARCHER_PROJECTION(modulesManager));
  return graphql(payload, ACTION_TYPE.SEARCH_PAYROLLS);
}

export function fetchPayroll(modulesManager, params) {
  const payload = formatPageQueryWithCount('payroll', params, PAYROLL_PROJECTION(modulesManager));
  return graphql(payload, ACTION_TYPE.GET_PAYROLL);
}

export function deletePayrolls(payroll, clientMutationLabel) {
  const uuid = isBase64Encoded(payroll.id) ? decodeId(payroll?.id) : payroll?.id;
  const payrollUuids = `ids: ["${uuid}"]`;
  return PERFORM_MUTATION(
    MUTATION_SERVICE.PAYROLL.DELETE,
    payrollUuids,
    ACTION_TYPE.DELETE_PAYROLL,
    clientMutationLabel,
  );
}

export function deleteBenefitConsumption(benefit, clientMutationLabel) {
  const uuid = isBase64Encoded(benefit.id) ? decodeId(benefit?.id) : benefit?.id;
  const benefitUuids = `ids: ["${uuid}"]`;
  return PERFORM_MUTATION(
    MUTATION_SERVICE.BENEFIT_CONSUMPTION.DELETE,
    benefitUuids,
    ACTION_TYPE.DELETE_BENEFIT_CONSUMPTION,
    clientMutationLabel,
  );
}

export function createPayroll(payroll, clientMutationLabel) {
  return PERFORM_MUTATION(
    MUTATION_SERVICE.PAYROLL.CREATE,
    formatPayrollGQL(payroll),
    ACTION_TYPE.CREATE_PAYROLL,
    clientMutationLabel,
  );
}

export function createConsolidatedPayroll(payload, clientMutationLabel) {
  const input = `districtId: "${payload.district.uuid}"
    benefitPlanId: "${payload.benefitPlan.uuid}"
    sourcePayrollIds: [${payload.sourcePayrollIds.map((id) => `"${decodeId(id)}"`).join(', ')}]`;
  return PERFORM_MUTATION(
    MUTATION_SERVICE.PAYROLL.CREATE_CONSOLIDATED,
    input,
    ACTION_TYPE.CREATE_CONSOLIDATED_PAYROLL,
    clientMutationLabel,
  );
}

export function fetchBenefitConsumptions(modulesManager, params) {
  const payload = formatPageQueryWithCount('benefitConsumptionByPayroll', params, BENEFIT_CONSUMPTION_PROJECTION());
  return graphql(payload, ACTION_TYPE.GET_BENEFIT_CONSUMPTION);
}

export function fetchBenefitAttachments(modulesManager, params) {
  const payload = formatPageQueryWithCount('benefitAttachmentByPayroll', params, BENEFIT_ATTACHMENT_PROJECTION());
  return graphql(payload, ACTION_TYPE.GET_BENEFIT_ATTACHMENT);
}

export function fetchPayrollBenefitConsumptions(modulesManager, params) {
  // eslint-disable-next-line max-len
  const payload = formatPageQueryWithCount('payrollBenefitConsumption', params, PAYROLL_BENEFIT_CONSUMPTION_PROJECTION());
  return graphql(payload, ACTION_TYPE.GET_PAYROLL_BENEFIT_CONSUMPTION);
}

export function fetchBenefitsSummary(params) {
  const payload = formatQuery(
    'benefitsSummary',
    params,
    BENEFIT_CONSUMPTION_SUMMARY_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.BENEFITS_SUMMARY);
}

export const clearPayrollBills = () => (dispatch) => {
  dispatch({
    type: CLEAR(ACTION_TYPE.GET_BENEFIT_CONSUMPTION),
  });
};

export const clearPayroll = () => (dispatch) => {
  dispatch({
    type: CLEAR(ACTION_TYPE.GET_PAYROLL),
  });
};

export function fetchPaymentMethods(params) {
  const payload = formatQuery('paymentMethods', params, PAYMENT_METHOD_PROJECTION());
  return graphql(payload, ACTION_TYPE.GET_PAYMENT_METHODS);
}

export function closePayroll(payroll, clientMutationLabel) {
  const payrollUuids = `ids: ["${payroll?.id}"]`;
  return PERFORM_MUTATION(
    MUTATION_SERVICE.PAYROLL.CLOSE,
    payrollUuids,
    ACTION_TYPE.CLOSE_PAYROLL,
    clientMutationLabel,
  );
}

export function rejectPayroll(payroll, clientMutationLabel) {
  const payrollUuids = `ids: ["${payroll?.id}"]`;
  return PERFORM_MUTATION(
    MUTATION_SERVICE.PAYROLL.REJECT,
    payrollUuids,
    ACTION_TYPE.REJECT_PAYROLL,
    clientMutationLabel,
  );
}

export function makePaymentForPayroll(payroll, clientMutationLabel) {
  const payrollUuids = `ids: ["${payroll?.id}"]`;
  return PERFORM_MUTATION(
    MUTATION_SERVICE.PAYROLL.MAKE_PAYMENT,
    payrollUuids,
    ACTION_TYPE.MAKE_PAYMENT_PAYROLL,
    clientMutationLabel,
  );
}
