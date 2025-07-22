# Database Guide - Cluster-API Management Console

## 🗄️ **Database Overview**

The application uses **SQLite** for development and can be easily migrated to **PostgreSQL** or **MySQL** for production.

---

## 📍 **Database Location**
- **File**: `cluster-api-backend/cluster_api.db`
- **Type**: SQLite 3
- **Size**: ~50KB (with sample data)

---

## 🏗️ **Complete Database Schema**

### **1. Organizations Table**
```sql
CREATE TABLE organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    subscription_tier VARCHAR(20) NOT NULL,  -- free, starter, professional, enterprise
    max_clusters INTEGER DEFAULT 3,
    max_nodes_per_cluster INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 5,
    max_cloud_accounts INTEGER DEFAULT 2,
    trial_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **2. Users Table**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(20) NOT NULL,  -- super_admin, org_admin, cluster_admin, developer, viewer
    organization_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INTEGER DEFAULT 0,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
);
```

### **3. Clusters Table**
```sql
CREATE TABLE clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,  -- aws, gcp, azure, sify, vmware, onprem
    region VARCHAR(100),
    kubernetes_version VARCHAR(20),
    topology VARCHAR(50),  -- single_master, multi_master, all_in_one
    worker_count INTEGER DEFAULT 2,
    gpu_enabled BOOLEAN DEFAULT FALSE,
    gpu_type VARCHAR(50),
    gpu_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, creating, running, scaling, error, deleting
    organization_id INTEGER NOT NULL,
    cloud_account_id INTEGER,
    cost_per_month DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations (id),
    FOREIGN KEY (cloud_account_id) REFERENCES cloud_accounts (id)
);
```

### **4. Cloud Accounts Table**
```sql
CREATE TABLE cloud_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,  -- aws, gcp, azure, sify, vmware, onprem
    credentials_encrypted TEXT NOT NULL,  -- Encrypted JSON credentials
    is_active BOOLEAN DEFAULT TRUE,
    last_validated TIMESTAMP,
    validation_status VARCHAR(20) DEFAULT 'pending',  -- pending, valid, invalid, error
    organization_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
);
```

### **5. Audit Logs Table**
```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    organization_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,  -- login, logout, create_cluster, scale_cluster, etc.
    resource_type VARCHAR(50),     -- cluster, user, organization, cloud_account
    resource_id INTEGER,
    details TEXT,                  -- JSON details of the action
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
);
```

---

## 📊 **Sample Data Overview**

### **Organizations**
| ID | Name | Tier | Max Clusters | Max Nodes | Max Users |
|----|------|------|--------------|-----------|-----------|
| 1 | Sify Technologies | enterprise | 999 | 500 | 200 |
| 2 | Demo Company | professional | 50 | 100 | 50 |
| 3 | Tech Startup | free | 3 | 5 | 5 |

### **Users**
| ID | Email | Role | Organization |
|----|-------|------|--------------|
| 1 | admin@sifytechnologies.com | super_admin | Sify Technologies |
| 2 | clusters@sifytechnologies.com | cluster_admin | Sify Technologies |
| 3 | admin@example.com | org_admin | Demo Company |
| 4 | developer@example.com | developer | Demo Company |
| 5 | founder@techstartup.com | org_admin | Tech Startup |

### **Sample Clusters**
| ID | Name | Provider | Status | Organization |
|----|------|----------|--------|--------------|
| 1 | sify-production-cluster | SIFY | running | Sify Technologies |
| 2 | sify-development-cluster | AWS | running | Sify Technologies |

---

## 🔍 **Database Access Methods**

### **Method 1: SQLite Command Line**
```bash
# Navigate to backend directory
cd cluster-api-backend

# Open database
sqlite3 cluster_api.db

# Useful SQLite commands:
.help                           # Show all commands
.tables                         # List all tables
.schema                         # Show all table schemas
.schema organizations          # Show specific table schema
.mode column                   # Better column display
.headers on                    # Show column headers

# Query examples:
SELECT * FROM organizations;
SELECT email, role, organization_id FROM users;
SELECT name, provider, status FROM clusters;
SELECT action, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 10;

# Exit
.quit
```

### **Method 2: Python Database Viewer**
```python
# Create db_viewer.py in cluster-api-backend directory
import sqlite3
import json
from datetime import datetime

def view_database():
    conn = sqlite3.connect('cluster_api.db')
    conn.row_factory = sqlite3.Row  # Enable column access by name
    
    # View organizations
    print("=== ORGANIZATIONS ===")
    cursor = conn.execute("SELECT * FROM organizations")
    for row in cursor.fetchall():
        print(f"ID: {row['id']}, Name: {row['name']}, Tier: {row['subscription_tier']}")
    
    # View users
    print("\n=== USERS ===")
    cursor = conn.execute("""
        SELECT u.id, u.email, u.role, o.name as org_name, u.is_active, u.last_login
        FROM users u 
        JOIN organizations o ON u.organization_id = o.id
    """)
    for row in cursor.fetchall():
        print(f"ID: {row['id']}, Email: {row['email']}, Role: {row['role']}, Org: {row['org_name']}")
    
    # View clusters
    print("\n=== CLUSTERS ===")
    cursor = conn.execute("""
        SELECT c.id, c.name, c.provider, c.status, o.name as org_name, c.worker_count
        FROM clusters c 
        JOIN organizations o ON c.organization_id = o.id
    """)
    for row in cursor.fetchall():
        print(f"ID: {row['id']}, Name: {row['name']}, Provider: {row['provider']}, Status: {row['status']}")
    
    # View recent audit logs
    print("\n=== RECENT AUDIT LOGS ===")
    cursor = conn.execute("""
        SELECT a.action, u.email, a.timestamp, a.details
        FROM audit_logs a 
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.timestamp DESC LIMIT 5
    """)
    for row in cursor.fetchall():
        print(f"Action: {row['action']}, User: {row['email']}, Time: {row['timestamp']}")
    
    conn.close()

if __name__ == "__main__":
    view_database()
```

### **Method 3: Web-based Database Browser**
```bash
# Install sqlite-web (optional)
pip install sqlite-web

# Start web interface
sqlite_web cluster_api.db

# Access at http://localhost:8080
# Provides web-based database browsing and editing
```

---

## 🔧 **Database Management Commands**

### **Backup Database**
```bash
# Create backup
cp cluster_api.db cluster_api_backup_$(date +%Y%m%d_%H%M%S).db

# Or use SQLite backup command
sqlite3 cluster_api.db ".backup cluster_api_backup.db"
```

### **Reset Database**
```bash
# Delete existing database
rm cluster_api.db

# Reinitialize with sample data
python src/database/init_db.py
```

### **Export Data**
```bash
# Export to SQL
sqlite3 cluster_api.db ".dump" > cluster_api_export.sql

# Export specific table to CSV
sqlite3 -header -csv cluster_api.db "SELECT * FROM organizations;" > organizations.csv
```

### **Import Data**
```bash
# Import from SQL dump
sqlite3 new_cluster_api.db < cluster_api_export.sql
```

---

## 🔐 **Security Notes**

### **Encrypted Fields**
- **User Passwords**: Stored as bcrypt hashes in `password_hash` field
- **Cloud Credentials**: Encrypted using Fernet symmetric encryption in `credentials_encrypted` field
- **JWT Secrets**: Stored in environment variables or config files

### **Viewing Encrypted Data**
```python
# To decrypt cloud account credentials (for debugging)
from cryptography.fernet import Fernet
import json

# Get encryption key (from your app config)
key = b'your-encryption-key-here'  # Replace with actual key
fernet = Fernet(key)

# Decrypt credentials
encrypted_data = "encrypted-credentials-from-db"
decrypted_data = fernet.decrypt(encrypted_data.encode())
credentials = json.loads(decrypted_data.decode())
print(credentials)
```

---

## 📈 **Database Monitoring**

### **Check Database Size**
```bash
ls -lh cluster_api.db
```

### **Table Row Counts**
```sql
SELECT 
    'organizations' as table_name, COUNT(*) as row_count FROM organizations
UNION ALL SELECT 
    'users', COUNT(*) FROM users
UNION ALL SELECT 
    'clusters', COUNT(*) FROM clusters
UNION ALL SELECT 
    'cloud_accounts', COUNT(*) FROM cloud_accounts
UNION ALL SELECT 
    'audit_logs', COUNT(*) FROM audit_logs;
```

### **Database Statistics**
```sql
-- Most active organizations
SELECT o.name, COUNT(c.id) as cluster_count
FROM organizations o
LEFT JOIN clusters c ON o.id = c.organization_id
GROUP BY o.id, o.name
ORDER BY cluster_count DESC;

-- User activity
SELECT u.email, COUNT(a.id) as action_count
FROM users u
LEFT JOIN audit_logs a ON u.id = a.user_id
GROUP BY u.id, u.email
ORDER BY action_count DESC;
```

---

## 🚀 **Production Database Migration**

### **PostgreSQL Migration**
```python
# Update database URL in config
DATABASE_URL = "postgresql://username:password@localhost/cluster_api"

# Install PostgreSQL adapter
pip install psycopg2-binary

# Update SQLAlchemy configuration
from sqlalchemy import create_engine
engine = create_engine(DATABASE_URL)
```

### **MySQL Migration**
```python
# Update database URL in config
DATABASE_URL = "mysql+pymysql://username:password@localhost/cluster_api"

# Install MySQL adapter
pip install PyMySQL

# Update SQLAlchemy configuration
from sqlalchemy import create_engine
engine = create_engine(DATABASE_URL)
```

This database guide provides everything you need to understand, access, and manage the multi-tenant database structure!

