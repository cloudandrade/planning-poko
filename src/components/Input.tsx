import React from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, id, ...props }) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 11)}`; // Usando slice em vez de substr
  
  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        {...props}
      />
      {error && (
        <div className="invalid-feedback">{error}</div>
      )}
    </div>
  );
};

export default Input;
