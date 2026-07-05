import React from 'react';

const Input = ({ 
  label, 
  id, 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  required = false,
  error = "",
  className = ""
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-midnight-blue px-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input 
        id={id}
        type={type} 
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full p-4 bg-white border ${error ? 'border-red-500' : 'border-gray-300'} rounded-xl outline-none focus:border-midnight-blue focus:ring-1 focus:ring-midnight-blue transition-all text-midnight-blue`}
      />
      {error && <p className="text-xs text-red-500 px-1 font-medium">{error}</p>}
    </div>
  );
};

export default Input;
