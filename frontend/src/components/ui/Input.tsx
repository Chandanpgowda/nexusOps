import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={`input-group ${className}`}>
        {label && <label className="input-group__label" htmlFor={inputId}>{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={`input ${error ? 'input--error' : ''}`}
          {...props}
        />
        {error && <span className="input-group__error">{error}</span>}
        {hint && !error && <span className="input-group__hint">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={`input-group ${className}`}>
        {label && <label className="input-group__label" htmlFor={inputId}>{label}</label>}
        <textarea
          ref={ref}
          id={inputId}
          className={`input input--textarea ${error ? 'input--error' : ''}`}
          rows={4}
          {...props}
        />
        {error && <span className="input-group__error">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
