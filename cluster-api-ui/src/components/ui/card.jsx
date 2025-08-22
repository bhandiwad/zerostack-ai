import React from 'react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

function Card({
  className,
  children,
  hover = false,
  ...props
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow transition-all duration-200",
        hover && "hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({
  className,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        "px-8 py-5 border-b border-gray-100",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardTitle({
  className,
  children,
  ...props
}) {
  return (
    <h3
      className={cn("text-lg font-semibold text-gray-900", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

function CardDescription({
  className,
  children,
  ...props
}) {
  return (
    <p
      className={cn("text-sm text-gray-600 mt-1", className)}
      {...props}
    >
      {children}
    </p>
  );
}

function CardAction({
  className,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardContent({
  className,
  children,
  ...props
}) {
  return (
    <div 
      className={cn("px-8 py-6", className)} 
      {...props}
    >
      {children}
    </div>
  );
}

function CardFooter({
  className,
  children,
  ...props
}) {
  return (
    <div
      className={cn("px-8 py-5 border-t border-gray-100 bg-gray-50", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
