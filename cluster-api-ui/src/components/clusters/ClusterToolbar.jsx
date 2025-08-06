import React from 'react';

const ClusterToolbar = ({
  searchTerm,
  setSearchTerm,
  selectedProvider,
  setSelectedProvider,
  providers,
  selectedStatus,
  setSelectedStatus,
  statuses,
  onRefresh,
  loading,
}) => {
  return (
    <>
      <div className="clusters-header">
        <div className="clusters-title">
          <h2>Cluster Management</h2>
          <span className="clusters-count">{/* This should be passed as a prop */} clusters</span>
        </div>
        <div className="clusters-actions">
          <button
            className="refresh-button"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? '🔄' : '🔄'} Refresh
          </button>
        </div>
      </div>

      <div className="clusters-navigation">
        <div className="filter-tabs">
          <div className="filter-group">
            <label>Provider:</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              {providers.map(provider => (
                <option key={provider} value={provider}>
                  {provider === 'all' ? 'All Providers' : provider.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search clusters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
    </>
  );
};

export default ClusterToolbar;
