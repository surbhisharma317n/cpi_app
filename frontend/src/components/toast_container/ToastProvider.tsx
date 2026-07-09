'use client';
import { Toaster } from 'react-hot-toast';
import { WarningToast } from './WarningToast';

export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 5000,
        success: { className: 'hidden' },
        error: { className: 'hidden' },
        loading: { className: 'hidden' },
        custom: { duration: 5000 },
      }}
    >
      {(t) => (
        <>
          {t.type === 'custom' && t.message && (
            <WarningToast toast={t} message={t.message as string} />
          )}
        </>
      )}
    </Toaster>
  );
};
