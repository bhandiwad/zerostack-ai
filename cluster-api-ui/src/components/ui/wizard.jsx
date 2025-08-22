import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Icon } from './icons';

// Wizard Context
const WizardContext = createContext();

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a Wizard component');
  }
  return context;
};

// Main Wizard Component
export const Wizard = ({ 
  children, 
  onComplete, 
  onStepChange,
  className = '',
  ...props 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [stepData, setStepData] = useState({});

  const steps = React.Children.toArray(children).filter(
    child => child.type === WizardStep
  );

  const totalSteps = steps.length;

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      onStepChange?.(newStep, stepData);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      onStepChange?.(newStep, stepData);
    }
  };

  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < totalSteps) {
      setCurrentStep(stepIndex);
      onStepChange?.(stepIndex, stepData);
    }
  };

  const updateStepData = (key, value) => {
    setStepData(prev => ({ ...prev, [key]: value }));
  };

  const completeWizard = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    onComplete?.(stepData);
  };

  const isStepCompleted = (stepIndex) => completedSteps.has(stepIndex);
  const isStepAccessible = (stepIndex) => stepIndex <= currentStep || completedSteps.has(stepIndex);

  const value = {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    goToStep,
    stepData,
    updateStepData,
    completeWizard,
    isStepCompleted,
    isStepAccessible,
  };

  return (
    <WizardContext.Provider value={value}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </WizardContext.Provider>
  );
};

// Wizard Header with Progress
export const WizardHeader = ({ className = '', children }) => {
  const { currentStep, totalSteps } = useWizard();
  
  return (
    <div className={cn('mb-8', className)}>
      {children}
      <div className="mt-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Step {currentStep + 1} of {totalSteps}</span>
          <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-indigo-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  );
};

// Step Navigation
export const WizardNavigation = ({ className = '' }) => {
  const { currentStep, totalSteps, isStepCompleted, isStepAccessible, goToStep } = useWizard();

  const steps = Array.from({ length: totalSteps }, (_, index) => ({
    index,
    isCompleted: isStepCompleted(index),
    isCurrent: index === currentStep,
    isAccessible: isStepAccessible(index),
  }));

  return (
    <nav className={cn('mb-8', className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => (
          <li key={index} className="flex items-center">
            <button
              onClick={() => step.isAccessible && goToStep(step.index)}
              disabled={!step.isAccessible}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200',
                step.isCurrent && 'border-indigo-600 bg-indigo-600 text-white',
                step.isCompleted && !step.isCurrent && 'border-green-600 bg-green-600 text-white',
                !step.isCurrent && !step.isCompleted && step.isAccessible && 'border-gray-300 text-gray-500 hover:border-indigo-600',
                !step.isAccessible && 'border-gray-200 text-gray-300 cursor-not-allowed'
              )}
            >
              {step.isCompleted ? (
                <Icon name="success" size="sm" />
              ) : (
                <span className="text-sm font-medium">{step.index + 1}</span>
              )}
            </button>
            {index < totalSteps - 1 && (
              <div className={cn(
                'w-12 h-0.5 mx-2 transition-colors duration-200',
                step.isCompleted ? 'bg-green-600' : 'bg-gray-200'
              )} />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Individual Step
export const WizardStep = ({ 
  children, 
  title, 
  description,
  className = '',
  ...props 
}) => {
  const { currentStep } = useWizard();
  const stepIndex = parseInt(props['data-step-index'] || 0);
  const isActive = stepIndex === currentStep;

  if (!isActive) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn('w-full', className)}
        {...props}
      >
        {(title || description) && (
          <div className="mb-6">
            {title && (
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-gray-600">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Step Actions (Navigation Buttons)
export const WizardActions = ({ 
  onNext,
  onPrev,
  nextLabel = 'Next',
  prevLabel = 'Previous',
  completeLabel = 'Complete',
  nextDisabled = false,
  showPrev = true,
  className = '',
}) => {
  const { 
    currentStep, 
    totalSteps, 
    nextStep, 
    prevStep, 
    completeWizard 
  } = useWizard();

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if (isLastStep) {
      completeWizard();
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    } else {
      prevStep();
    }
  };

  return (
    <div className={cn('flex items-center justify-between pt-6 border-t border-gray-200', className)}>
      <div>
        {showPrev && !isFirstStep && (
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <Icon name="chevron-left" size="sm" className="mr-2" />
            {prevLabel}
          </button>
        )}
      </div>
      
      <button
        type="button"
        onClick={handleNext}
        disabled={nextDisabled}
        className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLastStep ? completeLabel : nextLabel}
        {!isLastStep && <Icon name="chevron-right" size="sm" className="ml-2" />}
      </button>
    </div>
  );
};

// Form Field Component for Wizard Steps
export const WizardField = ({ 
  label, 
  description, 
  error, 
  required = false,
  children,
  className = '' 
}) => {
  return (
    <div className={cn('mb-6', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {description && (
        <p className="text-sm text-gray-600 mb-3">{description}</p>
      )}
      {children}
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center">
          <Icon name="error" size="sm" className="mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

export default Wizard;
