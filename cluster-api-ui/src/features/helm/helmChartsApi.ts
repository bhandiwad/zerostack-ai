import { JSONValue } from '../agents/types';
import { apiCall } from '../../utils/api';

export const helmChartsApi = {
  // Repositories
  listRepositories: (clusterId: string) => apiCall(`/v1/helm/repositories`),
  addRepository: (clusterId: string, name: string, url: string) =>
    apiCall(`/v1/helm/repositories`, {
      method: 'POST',
      data: { name, url },
    }),
  deleteRepository: (clusterId: string, name: string) =>
    apiCall(`/v1/helm/repositories/${name}`, {
      method: 'DELETE',
    }),
  
  // Charts
  listCharts: (clusterId: string) => apiCall(`/v1/helm/charts`),
  
  // Releases
  listReleases: (clusterId: string) => apiCall(`/v1/helm/releases`),
  installChart: (clusterId: string, releaseName: string, namespace: string, chart: string, version: string, values: JSONValue) =>
    apiCall(`/v1/helm/releases`, {
      method: 'POST',
      data: { 
        release_name: releaseName, 
        namespace, 
        chart_name: chart, 
        version, 
        values
      },
    }),
  getReleaseValues: (clusterId: string, releaseName: string) =>
    apiCall(`/v1/helm/releases/${releaseName}/values`),
  deleteRelease: (clusterId: string, releaseName: string) =>
    apiCall(`/v1/helm/releases/${releaseName}`, {
      method: 'DELETE',
    }),
};
