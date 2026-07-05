import React from 'react';

export const Input = React.forwardRef(({ label, error, ...props }, ref) => {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-semibold text-t-primary px-1">{label}</label>}
      <input
        ref={ref}
        {...props}
        className={`w-full py-3 px-4 bg-t-surface glass-card border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-t-border-strong focus:border-midnight-blue focus:ring-midnight-blue'} rounded-xl outline-none focus:ring-1 transition-all`}
      />
      {error && <p className="text-xs text-red-500 px-1 mt-1 font-medium">{error.message}</p>}
    </div>
  );
});

Input.displayName = 'Input';
