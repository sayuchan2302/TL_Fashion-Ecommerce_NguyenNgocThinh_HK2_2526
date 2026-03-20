import { AnimatePresence, motion } from 'framer-motion';

interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const AdminConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          className="drawer-overlay"
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        />
        <motion.div
          className="confirm-modal"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <h3>{title}</h3>
          <p>{description}</p>
          <div className="confirm-modal-actions">
            <button className="admin-ghost-btn" onClick={onCancel}>{cancelLabel}</button>
            <button className={`admin-primary-btn ${danger ? 'danger' : ''}`.trim()} onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default AdminConfirmDialog;
