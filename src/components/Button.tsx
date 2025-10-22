import React from 'react';
import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  fullWidth = false,
  disabled = false
}) => {
  // Mapeamento de variantes para classes do Bootstrap
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline-primary'
  };
  
  const widthClass = fullWidth ? 'w-100' : '';
  
  return (
    <button
      className={`btn ${variantClasses[variant]} ${widthClass}`}
      onClick={onClick}
      disabled={disabled}
      style={variant === 'primary' ? { backgroundColor: 'var(--primary)' } : {}}
    >
      {children}
    </button>
  );
};

export default Button;
