import { JSONValue } from '../agents/types';
import apiCall from '../../lib/api';

export const helmChartsApi = {
  listRepositories: (clusterId: string) => apiCall(`/v1/clusters/${clusterId}/helm/repositories`),
  addRepository: (clusterId: string, name: string, url: string) =>
    apiCall(`/v1/clusters/${clusterId}/helm/repositories`, {
      method: 'POST',
      data: { name, url },
    }),
  deleteRepository: (clusterId: string, name: string) =>
    apiCall(`/v1/clusters/${clusterId}/helm/repositories/${name}`, {
      method: 'DELETE',
    }),
  listCharts: (clusterId: string) => apiCall(`/v1/clusters/${clusterId}/helm/charts`),
  installChart: (clusterId: string, releaseName: string, namespace: string, chart: string, version: string, values: JSONValue) =>
    apiCall(`/v1/clusters/${clusterId}/helm/releases`, {
      method: 'POST',
      data: { release_name: releaseName, namespace, chart_name: chart, version, values },
    }),
  listReleases: (clusterId: string) => apiCall(`/v1/clusters/${clusterId}/helm/releases`),
  getReleaseValues: (clusterId: string, releaseName: string) =>
    apiCall(`/v1/clusters/${clusterId}/helm/releases/${releaseName}/values`),
  deleteRelease: (clusterId: string, releaseName: string) =>
    apiCall(`/v1/clusters/${clusterId}/helm/releases/${releaseName}`, {
      method: 'DELETE',
    }),
};
