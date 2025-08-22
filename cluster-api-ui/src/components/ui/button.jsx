import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const Button = forwardRef(({ 
  children, 
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
  rounded = 'lg',
  className = '',
  ...props 
}, ref) => {
  // Base styles
  const baseStyles = [
    'inline-flex items-center justify-center',
    'font-medium',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none',
    'relative overflow-hidden',
    'whitespace-nowrap',
    fullWidth ? 'w-full' : '',
    `rounded-${rounded}`,
  ];
  
  // Variants
  const variants = {
    primary: [
      'bg-indigo-600 text-white',
      'hover:bg-indigo-700',
      'active:bg-indigo-800',
      'focus:ring-indigo-500',
      'shadow-sm hover:shadow-md',
    ],
    secondary: [
      'bg-white text-gray-700 border border-gray-300',
      'hover:bg-gray-50',
      'active:bg-gray-100',
      'focus:ring-indigo-500',
      'shadow-sm',
    ],
    ghost: [
      'bg-transparent text-gray-700',
      'hover:bg-gray-100',
      'active:bg-gray-200',
      'focus:ring-indigo-500',
    ],
    danger: [
      'bg-red-600 text-white',
      'hover:bg-red-700',
      'active:bg-red-800',
      'focus:ring-red-500',
      'shadow-sm hover:shadow-md',
    ],
    success: [
      'bg-green-600 text-white',
      'hover:bg-green-700',
      'active:bg-green-800',
      'focus:ring-green-500',
      'shadow-sm hover:shadow-md',
    ],
    link: [
      'text-indigo-600 hover:text-indigo-800',
      'hover:underline',
      'p-0 h-auto',
    ],
  };
  
  // Sizes
  const sizes = {
    xs: ['text-xs', 'h-6', 'px-2', 'gap-1'],
    sm: ['text-sm', 'h-8', 'px-3', 'gap-1.5'],
    md: ['text-sm', 'h-10', 'px-4', 'gap-2'],
    lg: ['text-base', 'h-12', 'px-6', 'gap-2'],
    xl: ['text-base', 'h-14', 'px-8', 'gap-3'],
  };
  
  // Icon sizes
  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(
        ...baseStyles,
        ...(variants[variant] || variants.primary),
        ...(sizes[size] || sizes['md']), // Fallback to 'md' size if size is invalid
        className
      )}
      disabled={isDisabled || isLoading}
      ref={ref}
      {...props}
    >
      {/* Loading state */}
      {isLoading && (
        <motion.span 
          className={`absolute ${iconSizes[size]}`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </motion.span>
      )}
      
      {/* Left icon */}
      {leftIcon && !isLoading && (
        <span className={cn(iconSizes[size], 'flex-shrink-0')}>
          {leftIcon}
        </span>
      )}
      
      {/* Button text */}
      <span className={cn('block', {
        'opacity-0': isLoading,
        'opacity-100': !isLoading,
      })}>
        {children}
      </span>
      
      {/* Right icon */}
      {rightIcon && !isLoading && (
        <span className={cn(iconSizes[size], 'flex-shrink-0')}>
          {rightIcon}
        </span>
      )}
    </motion.button>
  );
});

Button.displayName = 'Button';

export { Button };
export default Button;
