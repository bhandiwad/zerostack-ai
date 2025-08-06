import apiCall from '../../lib/api';

interface ResourceParams {
  resource_type: string;
  namespace?: string;
}

export const clusterExplorerApi = {
  getResources: (clusterId: string, params: ResourceParams) => {
        const queryParams: Record<string, string> = { resource_type: params.resource_type };
    if (params.namespace) {
      queryParams.namespace = params.namespace;
    }
    const query = new URLSearchParams(queryParams).toString();
    return apiCall(`/v1/clusters/${clusterId}/resources?${query}`);
  },
};
