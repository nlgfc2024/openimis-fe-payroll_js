import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { IconButton, Tooltip } from '@material-ui/core';
import DownloadIcon from '@material-ui/icons/CloudDownload';

import {
  Searcher,
  decodeId,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';
import {
  DEFAULT_PAGE_SIZE, MODULE_NAME,
  ROWS_PER_PAGE_OPTIONS, PAYROLL_PAYMENT_FILE_STATUS,
} from '../../constants';
import { fetchPayrollPaymentFiles } from '../../actions';
import downloadPayroll from '../../utils/export';
import AdditionalFieldsDialog from './dialogs/AdditionalFieldsDialog';

function PayrollPaymentFilesSearcher({
  fetchingPayrollFiles,
  fetchedPayrollFiles,
  errorPayrollFiles,
  files,
  pageInfo,
  totalCount,
  fetchPayrollPaymentFiles,
  payrollUuid,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);

  const headers = () => [
    'payrollPaymentFile.fileName',
    'payrollPaymentFile.status',
    'payrollPaymentFile.download',
    '',
  ];

  const defaultFilters = () => {
    const filters = {
      isDeleted: {
        value: false,
        filter: 'isDeleted: false',
      },
    };
    if (payrollUuid) {
      filters.payrollId = {
        value: payrollUuid,
        filter: `payroll_Id: "${payrollUuid}"`,
      };
    }
    return filters;
  };

  const download = (payrollId, fileName, uploadId) => {
    downloadPayroll(payrollId, fileName, false, uploadId);
  };

  const fetchFiles = (params) => fetchPayrollPaymentFiles(modulesManager, params);

  const rowIdentifier = (file) => file.id;

  const formatErrors = (error) => {
    let reasonsByRow = error;
    if (typeof error === 'string') {
      try {
        reasonsByRow = JSON.parse(error);
      } catch (parseError) {
        return error;
      }
    }
    if (!reasonsByRow || Object.keys(reasonsByRow).length === 0) {
      return formatMessage('payroll.payrollPaymentFile.noMismatches');
    }
    return Object.entries(reasonsByRow).map(([row, reasons]) => {
      const detail = Array.isArray(reasons) ? reasons.join(", ") : JSON.stringify(reasons);
      return `Row ${row}: ${detail}`;
    }).join("; ");
  };

  const itemFormatters = () => [
    (file) => file.fileName,
    (file) => file.status,
    (file) => (
      <Tooltip title={formatMessage('tooltip.download')}>
        <IconButton
          onClick={() => download(payrollUuid, file.fileName, decodeId(file.id))}
          disabled={![PAYROLL_PAYMENT_FILE_STATUS.SUCCESS,
            PAYROLL_PAYMENT_FILE_STATUS.PENDING_REVIEW,
            PAYROLL_PAYMENT_FILE_STATUS.WAITING_FOR_VERIFICATION,
            PAYROLL_PAYMENT_FILE_STATUS.PARTIAL_SUCCESS,
            PAYROLL_PAYMENT_FILE_STATUS.DUPLICATE].includes(file.status)}
        >
          <DownloadIcon />
        </IconButton>
      </Tooltip>
    ),
    (file) => (
      <AdditionalFieldsDialog
        jsonExt={file?.jsonExt}
        additionalData={{ mismatchReasons: formatErrors(file.error) }}
        buttonLabel="payroll.summaryUpload"
        title="payroll.summaryUpload"
      />
    ),
  ];

  return (
    <Searcher
      module="payroll"
      FilterPane={null}
      fetch={fetchFiles}
      items={files}
      itemsPageInfo={pageInfo}
      fetchedItems={fetchedPayrollFiles}
      fetchingItems={fetchingPayrollFiles}
      errorItems={errorPayrollFiles}
      tableTitle={formatMessageWithValues('payrollPaymentFilesSearcher.results', { totalCount })}
      headers={headers}
      itemFormatters={itemFormatters}
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      rowIdentifier={rowIdentifier}
      defaultFilters={defaultFilters()}
    />
  );
}
const mapStateToProps = (state) => ({
  fetchingPayrollFiles: state.payroll.fetchingPayrollFiles,
  fetchedPayrollFiles: state.payroll.fetchedPayrollFiles,
  errorPayrollFiles: state.payroll.errorPayrollFiles,
  files: state.payroll.payrollFiles,
  pageInfo: state.payroll.payrollFilesPageInfo,
  totalCount: state.payroll.payrollFilesTotalCount,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchPayrollPaymentFiles,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PayrollPaymentFilesSearcher);
