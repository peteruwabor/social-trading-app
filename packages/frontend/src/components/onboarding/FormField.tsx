import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  helpText?: string;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  error,
  required = false,
  children,
  helpText,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label 
        htmlFor={name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {children}
        
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600" id={`${name}-error`}>
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p className="text-sm text-gray-500" id={`${name}-help`}>
          {helpText}
        </p>
      )}
    </div>
  );
};

interface TextInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  'aria-describedby'?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  maxLength,
  className = '',
  'aria-describedby': ariaDescribedBy
}) => {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className={`
        w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
        ${className}
      `}
      aria-describedby={ariaDescribedBy}
    />
  );
};

interface TextAreaProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  'aria-describedby'?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled = false,
  maxLength,
  className = '',
  'aria-describedby': ariaDescribedBy
}) => {
  return (
    <textarea
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      maxLength={maxLength}
      className={`
        w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
        resize-vertical
        ${className}
      `}
      aria-describedby={ariaDescribedBy}
    />
  );
};

interface SelectProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = '',
  'aria-describedby': ariaDescribedBy
}) => {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`
        w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
        ${className}
      `}
      aria-describedby={ariaDescribedBy}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

interface MultiSelectProps {
  id: string;
  name: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  maxSelections?: number;
  className?: string;
  'aria-describedby'?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  maxSelections,
  className = '',
  'aria-describedby': ariaDescribedBy
}) => {
  const handleToggle = (option: string) => {
    if (disabled) return;
    
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      if (maxSelections && value.length >= maxSelections) {
        return; // Don't add if max reached
      }
      onChange([...value, option]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleToggle(option)}
            disabled={disabled || (maxSelections ? value.length >= maxSelections && !value.includes(option) : false)}
            className={`
              p-3 border rounded-lg text-left transition-colors
              ${value.includes(option)
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 hover:bg-gray-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-describedby={ariaDescribedBy}
          >
            <span className="font-medium">{option}</span>
            {value.includes(option) && (
              <span className="ml-2 text-indigo-600">✓</span>
            )}
          </button>
        ))}
      </div>
      
      {maxSelections && (
        <p className="text-sm text-gray-500">
          {value.length} of {maxSelections} selected
        </p>
      )}
    </div>
  );
}; 