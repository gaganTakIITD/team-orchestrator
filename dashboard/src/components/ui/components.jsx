import React from 'react';

export function Badge({ children, variant = 'default', className = '' }) {
  const variantClass = {
    default: 'badge-default',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
  }[variant] || 'badge-default';

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {children}
    </span>
  );
}

export function Button({ children, onClick, variant = 'primary', className = '', fullWidth, disabled, type = 'button' }) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  }[variant] || 'btn-primary';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variantClass} ${fullWidth ? 'btn-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
