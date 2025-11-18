import React from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

// This style injection runs only once when the module is loaded.
const styles = `
@keyframes fade-in-down {
    0% {
        opacity: 0;
        transform: translateY(-10px);
    }
    100% {
        opacity: 1;
        transform: translateY(0);
    }
}
.animate-fade-in-down {
    animation: fade-in-down 0.3s ease-out;
}
`;

// A simple way to inject styles into the head idempotently
if (!document.getElementById('toast-animation-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'toast-animation-styles';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}


const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const isSuccess = type === 'success';

  const bgColor = isSuccess ? 'bg-green-600' : 'bg-red-600';
  const icon = isSuccess ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />;

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg text-white shadow-2xl animate-fade-in-down ${bgColor}`}
      role="alert"
    >
      {icon}
      <span className="font-semibold">{message}</span>
    </div>
  );
};

export default Toast;