import { apiHeaders, baseApiUrl } from '@openimis/fe-core';

const payrollFileName = (fileName) => `${fileName
  .replace(/^reconciliation_/i, '')
  .replace(/\.csv$/i, '')}.csv`;

export default function downloadPayroll(
  payrollId, payrollFileName, blank = true, uploadId = null, onError = null,
) {
  const url = new URL(
    `${window.location.origin}${baseApiUrl}/payroll/csv_reconciliation/`,
  );
  url.searchParams.append('payroll_id', payrollId);
  url.searchParams.append('blank', blank);
  url.searchParams.append('payroll_file_name', payrollFileName);
  if (uploadId) url.searchParams.append('upload_id', uploadId);

  const headers = new Headers(apiHeaders());
  headers.delete('Content-Type');

  return fetch(url, { headers })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Payroll export failed (${response.status})`);
      }
      return response.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = payrollFileName(payrollFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    })
    .catch((error) => {
      if (onError) onError(error);
      return null;
    });
}
