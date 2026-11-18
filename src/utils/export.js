import { apiHeaders, baseApiUrl } from '@openimis/fe-core';

export default function downloadPayroll(payrollId, payrollFileName, blank = true, uploadId = null) {
  const url = new URL(
    `${window.location.origin}${baseApiUrl}/payroll/csv_reconciliation/`,
  );
  url.searchParams.append('payroll_id', payrollId);
  url.searchParams.append('blank', blank);
  url.searchParams.append('payroll_file_name', payrollFileName);
  if (uploadId) url.searchParams.append('upload_id', uploadId);

  fetch(url, { headers: apiHeaders(), credentials: 'same-origin' })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Payroll export failed (${response.status})`);
      }
      return response.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = blank ? `${payrollFileName}.csv` : payrollFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Export failed, reason: ', error);
    });
}
