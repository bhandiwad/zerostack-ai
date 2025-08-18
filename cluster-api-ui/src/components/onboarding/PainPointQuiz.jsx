import React, { useState } from 'react';
import { ChevronRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const PainPointQuiz = ({ onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isComplete, setIsComplete] = useState(false);

  const questions = [
    {
      id: 'primary_pain',
      title: "What's your biggest Kubernetes challenge?",
      subtitle: "Help us tailor your experience",
      options: [
        {
          id: 'learning_curve',
          title: 'Learning Curve & Complexity',
          description: 'YAML configs, networking, and K8s concepts are overwhelming',
          icon: '📚',
          color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
        },
        {
          id: 'cost_waste',
          title: 'Cost Overruns & Waste',
          description: 'Cloud bills are high, resources are over-provisioned',
          icon: '💰',
          color: 'bg-green-50 border-green-200 hover:bg-green-100'
        },
        {
          id: 'debugging_failures',
          title: 'Debugging & Reliability',
          description: 'Hard-to-trace errors, cascading failures, downtime',
          icon: '🔧',
          color: 'bg-red-50 border-red-200 hover:bg-red-100'
        },
        {
          id: 'operational_overhead',
          title: 'Operational Overhead',
          description: 'Too much time on maintenance, not enough on product',
          icon: '⚙️',
          color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
        }
      ]
    },
    {
      id: 'team_size',
      title: "What's your team size?",
      subtitle: "This helps us recommend the right level of automation",
      options: [
        {
          id: 'solo',
          title: 'Solo Developer',
          description: 'Just me working on this project',
          icon: '👤',
          color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
        },
        {
          id: 'small_team',
          title: 'Small Team (2-5)',
          description: 'Small startup or project team',
          icon: '👥',
          color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
        },
        {
          id: 'medium_team',
          title: 'Medium Team (6-15)',
          description: 'Growing company with dedicated DevOps',
          icon: '👨‍👩‍👧‍👦',
          color: 'bg-green-50 border-green-200 hover:bg-green-100'
        },
        {
          id: 'large_team',
          title: 'Large Team (15+)',
          description: 'Enterprise with multiple teams',
          icon: '🏢',
          color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
        }
      ]
    },
    {
      id: 'experience_level',
      title: "What's your Kubernetes experience?",
      subtitle: "We'll adjust our guidance accordingly",
      options: [
        {
          id: 'beginner',
          title: 'Beginner',
          description: 'New to Kubernetes, learning the basics',
          icon: '🌱',
          color: 'bg-green-50 border-green-200 hover:bg-green-100'
        },
        {
          id: 'intermediate',
          title: 'Intermediate',
          description: 'Can deploy apps, but struggle with complex scenarios',
          icon: '🚀',
          color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
        },
        {
          id: 'advanced',
          title: 'Advanced',
          description: 'Comfortable with K8s, looking for optimization',
          icon: '⚡',
          color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
        },
        {
          id: 'expert',
          title: 'Expert',
          description: 'K8s expert, need enterprise-grade automation',
          icon: '🎯',
          color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
        }
      ]
    }
  ];

  const handleAnswer = (questionId, optionId) => {
    const newAnswers = { ...answers, [questionId]: optionId };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    } else {
      // Quiz complete
      setTimeout(() => {
        setIsComplete(true);
        onComplete(newAnswers);
      }, 300);
    }
  };

  const getPersonalizedMessage = () => {
    const painPoint = answers.primary_pain;
    const teamSize = answers.team_size;
    const experience = answers.experience_level;

    let message = "Perfect! Based on your responses, we'll create a personalized experience focused on ";
    
    switch (painPoint) {
      case 'learning_curve':
        message += "guided tutorials and simplified workflows";
        break;
      case 'cost_waste':
        message += "cost optimization and resource efficiency";
        break;
      case 'debugging_failures':
        message += "AI-powered troubleshooting and reliability";
        break;
      case 'operational_overhead':
        message += "automation and operational efficiency";
        break;
      default:
        message += "your specific needs";
    }

    if (teamSize === 'solo' || teamSize === 'small_team') {
      message += " with quick-start templates perfect for small teams.";
    } else {
      message += " with enterprise-grade collaboration features.";
    }

    return message;
  };

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="mb-6">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Assessment Complete!
          </h2>
          <p className="text-gray-600">
            {getPersonalizedMessage()}
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-2">Your Personalized Demo is Ready</h3>
          <p className="text-blue-100">
            We're generating a tailored cluster configuration based on your needs...
          </p>
        </div>

        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
          <div className="mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-lg text-white">🎯</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Let's Understand Your Kubernetes Challenges
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Help us tailor your experience by answering a few quick questions about your team's biggest pain points
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex justify-between text-sm text-gray-600 mb-3">
            <span className="font-medium">Question {currentQuestion + 1} of {questions.length}</span>
            <span className="font-medium">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {question.title}
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              {question.subtitle}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {question.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleAnswer(question.id, option.id)}
                className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-100 group"
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl group-hover:scale-110 transition-transform duration-200">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center">
          <button
            onClick={() => onComplete({})}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium underline transition-colors duration-200"
          >
            Skip this step and continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default PainPointQuiz;
