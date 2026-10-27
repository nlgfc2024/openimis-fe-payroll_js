import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import {
  useTranslations,
  useModulesManager,
} from '@openimis/fe-core';
import PayrollPaymentFilesSearcher from '../PayrollPaymentFilesSearcher';
import { MODULE_NAME } from '../../../constants';

function PayrollReconciliationFilesDialog({
  payroll, classes,
}) {
  const modulesManager = useModulesManager();
  const rights = useSelector((state) => state.core?.user?.i_user?.rights ?? []);
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="contained"
        color="primary"
        className={classes.button}
      >
        {formatMessage('payroll.viewReconciliationFiles')}
      </Button>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        PaperProps={{
          style: {
            width: 1000,
            maxWidth: 1000,
          },
        }}
      >
        <form noValidate>
          <DialogContent>
            <PayrollPaymentFilesSearcher
              module="payroll"
              payrollUuid={payroll?.id}
              rights={rights}
              showFilters={false}
            />
          </DialogContent>
          <DialogActions
            style={{
              display: 'inline',
              paddingLeft: '10px',
              marginTop: '25px',
              marginBottom: '15px',
            }}
          >
            <div style={{ maxWidth: '1000px' }}>
              <div style={{ float: 'right' }}>
                <Button
                  onClick={handleClose}
                  variant="outlined"
                  autoFocus
                  style={{
                    margin: '0 16px',
                    marginBottom: '15px',
                  }}
                >
                  {formatMessage('payroll.summary.close')}
                </Button>
              </div>
            </div>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

export default PayrollReconciliationFilesDialog;
