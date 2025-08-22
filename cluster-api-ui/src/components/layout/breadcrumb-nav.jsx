import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '../ui/breadcrumb';
import { Icon } from '../ui/icons';

const BreadcrumbNav = () => {
  const location = useLocation();
  
  // Route configuration for breadcrumbs
  const routeConfig = {
    '/': { label: 'Dashboard', icon: 'home' },
    '/clusters': { label: 'Clusters', icon: 'server' },
    '/clusters/new': { label: 'Create Cluster', icon: 'plus' },
    '/workflows': { label: 'Workflows', icon: 'cog' },
    '/debugging': { label: 'Debugging', icon: 'debugging' },
    '/maintenance': { label: 'Maintenance', icon: 'maintenance' },
    '/metrics': { label: 'Metrics', icon: 'metrics' },
    '/templates': { label: 'Templates', icon: 'document' },
    '/ai-hub': { label: 'AI Hub', icon: 'sparkles' },
    '/ai-endpoints': { label: 'AI Endpoints', icon: 'bolt' },
    '/cloud-accounts': { label: 'Cloud Accounts', icon: 'cloud' },
    '/helm-applications': { label: 'Helm Applications', icon: 'folder' },
    '/workflow-tester': { label: 'Workflow Tester', icon: 'beaker' },
    '/agent-performance': { label: 'Agent Performance', icon: 'chart-line' },
  };

  // Generate breadcrumb items from current path
  const generateBreadcrumbs = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Always include home/dashboard
    if (location.pathname !== '/') {
      breadcrumbs.push({
        path: '/',
        label: 'Dashboard',
        icon: 'home',
        isLast: false
      });
    }

    // Build breadcrumbs from path segments
    let currentPath = '';
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      const config = routeConfig[currentPath];
      
      if (config) {
        breadcrumbs.push({
          path: currentPath,
          label: config.label,
          icon: config.icon,
          isLast: index === pathParts.length - 1
        });
      } else {
        // Handle dynamic routes (like cluster IDs)
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        const parentConfig = routeConfig[parentPath];
        
        if (parentConfig) {
          breadcrumbs.push({
            path: currentPath,
            label: part.charAt(0).toUpperCase() + part.slice(1),
            icon: parentConfig.icon,
            isLast: index === pathParts.length - 1
          });
        }
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on dashboard
  if (location.pathname === '/' || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="flex items-center gap-2 text-gray-900 font-medium">
                    <Icon name={crumb.icon} size="sm" className="text-gray-600" />
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link 
                      to={crumb.path}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Icon name={crumb.icon} size="sm" />
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!crumb.isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default BreadcrumbNav;
