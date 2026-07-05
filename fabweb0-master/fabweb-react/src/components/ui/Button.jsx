import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  type = "button", 
  variant = "primary", 
  fullWidth = false,
  className = "" 
}) => {
  const baseClasses = "py-4 font-bold text-lg rounded-xl transition-all duration-300 active:scale-95";
  const widthClasses = fullWidth ? "w-full" : "w-auto px-8";
  
  const variants = {
    primary: "bg-button-gradient text-white shadow-[0_8px_20px_-5px_rgba(26,102,255,0.4)] hover:shadow-[0_12px_25px_-5px_rgba(26,102,255,0.5)] hover:-translate-y-1",
    secondary: "bg-midnight-blue text-white shadow-lg hover:brightness-110 hover:-translate-y-1",
    ghost: "text-midnight-blue/60 font-medium hover:text-midnight-blue bg-transparent shadow-none active:scale-100",
    success: "bg-emerald-500 text-white shadow-xl hover:brightness-110"
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      className={`${baseClasses} ${widthClasses} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
