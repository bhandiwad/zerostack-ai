import React, { useState } from 'react';
import PainPointQuiz from './PainPointQuiz';
import DemoClusterGenerator from './DemoClusterGenerator';

const OnboardingFlow = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState('quiz');
  const [quizAnswers, setQuizAnswers] = useState(null);
  const [clusterConfig, setClusterConfig] = useState(null);

  const handleQuizComplete = (answers) => {
    setQuizAnswers(answers);
    setCurrentStep('generator');
  };

  const handleClusterReady = (config) => {
    setClusterConfig(config);
    // Auto-advance to dashboard after 3 seconds, or user can click
    setTimeout(() => {
      if (onComplete) {
        onComplete({ quizAnswers, clusterConfig: config });
      }
    }, 3000);
  };

  const handleSkipToApp = () => {
    if (onComplete) {
      onComplete({ quizAnswers: {}, clusterConfig: null });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ZeroStack AI
              </div>
            </div>
            <button
              onClick={handleSkipToApp}
              className="text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Skip to app
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-12">
        {currentStep === 'quiz' && (
          <PainPointQuiz onComplete={handleQuizComplete} />
        )}
        
        {currentStep === 'generator' && quizAnswers && (
          <DemoClusterGenerator 
            quizAnswers={quizAnswers}
            onClusterReady={handleClusterReady}
          />
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>
            🚀 Transform your Kubernetes experience with AI-powered automation
            {currentStep === 'generator' && (
              <span className="ml-4">
                <button
                  onClick={() => onComplete({ quizAnswers, clusterConfig })}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Continue to dashboard →
                </button>
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
