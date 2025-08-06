

const Header = ({ user, organization, onLogout }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1>🏢 Cluster-API Console</h1>
        <span className="powered-by">Powered by Sify</span>
      </div>
      <div className="header-right">
        <div className="organization-info">
          <div className="org-name">{organization?.name}</div>
          <div className="org-tier">{organization?.subscription_tier}</div>
        </div>
        <div className="user-info">
          <span className="user-name">{user?.name}</span>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </div>
    </header>
  );
};

export default Header;

