import React from 'react';

const Select = ({ 
  label, 
  id, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Sélectionnez...",
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
      <div className="relative">
        <select 
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full p-4 bg-white border ${error ? 'border-red-500' : 'border-gray-300'} rounded-xl outline-none focus:border-midnight-blue focus:ring-1 focus:ring-midnight-blue transition-all appearance-none text-midnight-blue cursor-pointer`}
        >
          <option value="" disabled hidden>{placeholder}</option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value || opt}>{opt.label || opt}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-midnight-blue">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 px-1 font-medium">{error}</p>}
    </div>
  );
};

export default Select;
