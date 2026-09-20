'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;

  const icons = {
    success: <CheckCircle2 size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />
  };

  return (
    <div className="toast-container" onClick={onClose}>
      <div className={`toast toast-${type}`}>
        {icons[type] || icons.success}
        <span>{message}</span>
      </div>
    </div>
  );
}
