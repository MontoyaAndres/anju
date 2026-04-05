import { ReactNode } from 'react';
import MaterialButton from '@mui/material/Button';

import { Portal } from '../portal';
import { Overlay, Dialog } from './styles';

export interface IProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const Alert = (props: IProps) => {
  const {
    open,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    loading = false,
    onConfirm,
    onCancel
  } = props;

  if (!open) return null;

  return (
    <Portal>
      <Overlay
        role="button"
        tabIndex={0}
        onClick={() => { if (!loading) onCancel(); }}
        onKeyDown={e => {
          if (e.key === 'Escape' && !loading) onCancel();
        }}
      >
        <Dialog
          role="alertdialog"
          aria-labelledby="alert-title"
          onClick={e => e.stopPropagation()}
        >
          <p className="alert-title" id="alert-title">
            {title}
          </p>
          {description && <p className="alert-description">{description}</p>}
          <div className="alert-actions">
            <MaterialButton size="small" onClick={onCancel} disabled={loading}>
              {cancelText}
            </MaterialButton>
            <MaterialButton
              size="small"
              variant="contained"
              color="error"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Deleting...' : confirmText}
            </MaterialButton>
          </div>
        </Dialog>
      </Overlay>
    </Portal>
  );
};
