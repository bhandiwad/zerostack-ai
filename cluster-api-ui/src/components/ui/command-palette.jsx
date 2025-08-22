import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Icon } from './icons';
import { cn } from '../../lib/utils';

const CommandPalette = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Command categories and items
  const commands = [
    {
      category: 'Navigation',
      items: [
        { id: 'nav-dashboard', label: 'Dashboard', icon: 'home', action: () => navigate('/') },
        { id: 'nav-clusters', label: 'Clusters', icon: 'server', action: () => navigate('/clusters') },
        { id: 'nav-workflows', label: 'Workflows', icon: 'cog', action: () => navigate('/workflows') },
        { id: 'nav-debugging', label: 'Debugging', icon: 'debugging', action: () => navigate('/debugging') },
        { id: 'nav-maintenance', label: 'Maintenance', icon: 'maintenance', action: () => navigate('/maintenance') },
        { id: 'nav-metrics', label: 'Metrics', icon: 'metrics', action: () => navigate('/metrics') },
        { id: 'nav-templates', label: 'Templates', icon: 'document', action: () => navigate('/templates') },
        { id: 'nav-ai-hub', label: 'AI Hub', icon: 'sparkles', action: () => navigate('/ai-hub') },
        { id: 'nav-ai-endpoints', label: 'AI Endpoints', icon: 'bolt', action: () => navigate('/ai-endpoints') },
      ]
    },
    {
      category: 'Actions',
      items: [
        { id: 'action-create-cluster', label: 'Create New Cluster', icon: 'plus', action: () => navigate('/clusters/new') },
        { id: 'action-refresh', label: 'Refresh Data', icon: 'refresh', action: () => window.location.reload() },
        { id: 'action-search', label: 'Search Clusters', icon: 'search', action: () => navigate('/clusters') },
      ]
    },
    {
      category: 'Quick Access',
      items: [
        { id: 'quick-cloud-accounts', label: 'Cloud Accounts', icon: 'cloud', action: () => navigate('/cloud-accounts') },
        { id: 'quick-helm-apps', label: 'Helm Applications', icon: 'folder', action: () => navigate('/helm-applications') },
        { id: 'quick-workflow-tester', label: 'Workflow Tester', icon: 'beaker', action: () => navigate('/workflow-tester') },
        { id: 'quick-performance', label: 'Agent Performance', icon: 'chart-line', action: () => navigate('/agent-performance') },
      ]
    },
    {
      category: 'Help & Support',
      items: [
        { id: 'help-docs', label: 'Documentation', icon: 'book', action: () => window.open('https://docs.zerostack.ai', '_blank') },
        { id: 'help-support', label: 'Contact Support', icon: 'support', action: () => window.open('mailto:support@zerostack.ai') },
        { id: 'help-shortcuts', label: 'Keyboard Shortcuts', icon: 'key', action: () => {} },
      ]
    }
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // Open command palette
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = useCallback((commandId) => {
    const command = commands
      .flatMap(category => category.items)
      .find(item => item.id === commandId);
    
    if (command) {
      command.action();
      onClose();
    }
  }, [commands, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="flex items-start justify-center pt-[10vh] px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl"
          >
            <Command className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center px-4 py-3 border-b border-gray-100">
                <Icon name="search" size="sm" className="text-gray-400 mr-3" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-base"
                  autoFocus
                />
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600 font-mono">ESC</kbd>
                  <span>to close</span>
                </div>
              </div>

              <Command.List className="max-h-96 overflow-y-auto scrollbar-thin">
                <Command.Empty className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Icon name="search" size="lg" className="mb-3 text-gray-300" />
                  <p className="text-sm">No results found for "{search}"</p>
                  <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                </Command.Empty>

                {commands.map((category) => (
                  <Command.Group key={category.category} heading={category.category}>
                    <div className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                      {category.category}
                    </div>
                    {category.items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item.id)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                          "hover:bg-gray-50 aria-selected:bg-indigo-50 aria-selected:text-indigo-700",
                          "border-l-2 border-transparent aria-selected:border-indigo-500"
                        )}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 aria-selected:bg-indigo-100">
                          <Icon name={item.icon} size="sm" className="text-gray-600 aria-selected:text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.label}</div>
                        </div>
                        <Icon name="chevron-right" size="sm" className="text-gray-400" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white rounded border text-gray-600 font-mono">↑↓</kbd>
                      <span>navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white rounded border text-gray-600 font-mono">↵</kbd>
                      <span>select</span>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    Press <kbd className="px-1.5 py-0.5 bg-white rounded border text-gray-600 font-mono">⌘K</kbd> anytime
                  </div>
                </div>
              </div>
            </Command>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Hook for command palette
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return {
    isOpen,
    open,
    close,
    toggle,
    CommandPalette: (props) => <CommandPalette isOpen={isOpen} onClose={close} {...props} />
  };
};

export default CommandPalette;
