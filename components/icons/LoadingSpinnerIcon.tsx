import React from 'react';

export const LoadingSpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={`animate-spin ${props.className || ''}`}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2v4m0 12v4m8.66-10.66l-3.46 2M4.8 17.2l3.46-2m12.72.01l-3.46-2M4.8 6.8l3.46 2"
      strokeOpacity="0.25"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2V6"
    />
  </svg>
);
