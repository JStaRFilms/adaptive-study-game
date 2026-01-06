import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="w-16 h-16 border-4 border-solid border-gray-600 rounded-full border-t-brand-primary animate-spin"></div>
  );
};

export default LoadingSpinner;
