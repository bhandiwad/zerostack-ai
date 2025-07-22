# Complete Deployment Instructions - Cluster-API Management Console v5.0

## 🚀 **Step-by-Step Deployment Guide**

### **Prerequisites**
- Python 3.8+ installed
- Node.js 16+ and npm installed
- Git (optional, for version control)

---

## 📁 **1. Extract and Setup Project Structure**

```bash
# Extract the zip file
unzip cluster-api-multitenant-complete-v5.zip
cd cluster-api-multitenant-complete-v5/

# You should see:
# ├── cluster-api-backend/     # Flask backend
# ├── cluster-api-ui/          # React frontend
# └── *.md                     # Documentation files
```

---

## 🐍 **2. Backend Setup (Flask)**

### **Step 2.1: Navigate to Backend Directory**
```bash
cd cluster-api-backend
```

### **Step 2.2: Create Virtual Environment**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Verify activation (should show (venv) in prompt)
which python  # Should point to venv/bin/python
```

### **Step 2.3: Install Dependencies**
```bash
# Install all required packages
pip install flask flask-cors flask-sqlalchemy bcrypt pyjwt requests kubernetes python-dotenv cryptography

# Or if requirements.txt exists:
pip install -r requirements.txt

# Verify installation
pip list | grep -E "(flask|bcrypt|pyjwt|kubernetes)"
```

### **Step 2.4: Initialize Database**
```bash
# Initialize the multi-tenant database with sample data
python src/database/init_db.py

# You should see output like:
# "Database initialized successfully!"
# "Sample organizations and users created."
```

### **Step 2.5: Start Backend Server**
```bash
# Start the Flask development server
python src/main.py

# You should see:
# * Running on http://127.0.0.1:5000
# * Debug mode: on
```

**✅ Backend is now running on http://localhost:5000**

---

## 🌐 **3. Frontend Setup (React)**

### **Step 3.1: Open New Terminal and Navigate to Frontend**
```bash
# Open new terminal (keep backend running)
cd cluster-api-ui
```

### **Step 3.2: Install Dependencies**
```bash
# Install all npm packages
npm install

# This will install:
# - React, Vite, and build tools
# - UI components (shadcn/ui)
# - HTTP client (axios)
# - All other dependencies

# Verify installation
npm list --depth=0
```

### **Step 3.3: Start Frontend Development Server**
```bash
# Start the React development server
npm run dev

# You should see:
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

**✅ Frontend is now running on http://localhost:5173**

---

## 🗄️ **4. Database Schema and Access**

### **Database Location**
The SQLite database is created at: `cluster-api-backend/cluster_api.db`

### **Database Schema Overview**
```sql
-- Organizations table
CREATE TABLE organizations (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subscription_tier VARCHAR(20),
    created_at TIMESTAMP,
    -- ... more fields
);

-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(128),
    role VARCHAR(20),
    organization_id INTEGER,
    -- ... more fields
);

-- Clusters table
CREATE TABLE clusters (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50),
    organization_id INTEGER,
    -- ... more fields
);

-- Cloud Accounts table
CREATE TABLE cloud_accounts (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50),
    organization_id INTEGER,
    -- ... more fields
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100),
    timestamp TIMESTAMP,
    -- ... more fields
);
```

### **How to Access Database**

#### **Method 1: SQLite Command Line**
```bash
# Navigate to backend directory
cd cluster-api-backend

# Open database with sqlite3
sqlite3 cluster_api.db

# SQLite commands:
.tables                          # List all tables
.schema organizations           # Show table schema
SELECT * FROM organizations;    # View all organizations
SELECT * FROM users;           # View all users
SELECT * FROM clusters;        # View all clusters
.quit                          # Exit sqlite3
```

#### **Method 2: Python Script**
```bash
# Create a quick database viewer script
cd cluster-api-backend
cat > view_db.py << 'EOF'
import sqlite3
import pandas as pd

# Connect to database
conn = sqlite3.connect('cluster_api.db')

# View all tables
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables:", [table[0] for table in tables])

# View organizations
print("\n=== ORGANIZATIONS ===")
df_orgs = pd.read_sql_query("SELECT * FROM organizations", conn)
print(df_orgs)

# View users
print("\n=== USERS ===")
df_users = pd.read_sql_query("SELECT id, email, role, organization_id FROM users", conn)
print(df_users)

# View clusters
print("\n=== CLUSTERS ===")
df_clusters = pd.read_sql_query("SELECT * FROM clusters", conn)
print(df_clusters)

conn.close()
EOF

# Install pandas if needed
pip install pandas

# Run the script
python view_db.py
```

#### **Method 3: Database Browser (GUI)**
```bash
# Install DB Browser for SQLite (optional)
# Download from: https://sqlitebrowser.org/

# Open cluster_api.db file in the browser
# You can view/edit all tables graphically
```

---

## 🔐 **5. Test the Application**

### **Step 5.1: Access the Application**
1. Open browser: http://localhost:5173
2. You should see the Sify Cluster-API login page

### **Step 5.2: Test Login with Demo Accounts**

#### **Sify Technologies (Enterprise)**
- **Email**: admin@sifytechnologies.com
- **Password**: SifyAdmin123!
- **Features**: 999 clusters, GPU support

#### **Demo Company (Professional)**
- **Email**: admin@example.com
- **Password**: DemoAdmin123!
- **Features**: 50 clusters, 100 nodes/cluster

#### **Tech Startup (Free)**
- **Email**: founder@techstartup.com
- **Password**: StartupFounder123!
- **Features**: 3 clusters, 5 nodes/cluster

### **Step 5.3: Test Functionality**
1. **Login** → Should redirect to organization dashboard
2. **Dashboard** → Should show cluster statistics
3. **Create Cluster** → Should show cluster creation wizard
4. **Manage Clusters** → Should show existing clusters with Scale/Delete buttons
5. **Scale Cluster** → Should open modal and work with backend

---

## 🔧 **6. Troubleshooting**

### **Backend Issues**

#### **Database Not Found**
```bash
# Re-initialize database
cd cluster-api-backend
python src/database/init_db.py
```

#### **Import Errors**
```bash
# Reinstall dependencies
pip install --upgrade flask flask-cors flask-sqlalchemy bcrypt pyjwt requests kubernetes python-dotenv cryptography
```

#### **Port 5000 Already in Use**
```bash
# Kill process using port 5000
lsof -ti:5000 | xargs kill -9

# Or change port in src/main.py:
# app.run(host='0.0.0.0', port=5001, debug=True)
```

### **Frontend Issues**

#### **Node Modules Issues**
```bash
# Clear cache and reinstall
cd cluster-api-ui
rm -rf node_modules package-lock.json
npm install
```

#### **Port 5173 Already in Use**
```bash
# Kill process using port 5173
lsof -ti:5173 | xargs kill -9

# Or start on different port
npm run dev -- --port 3000
```

#### **API Connection Issues**
- Ensure backend is running on http://localhost:5000
- Check browser console for CORS errors
- Verify API endpoints are responding: `curl http://localhost:5000/api/auth/login`

---

## 🚀 **7. Production Deployment**

### **Backend Production**
```bash
# Install production WSGI server
pip install gunicorn

# Run with gunicorn
cd cluster-api-backend
gunicorn -w 4 -b 0.0.0.0:5000 src.main:app
```

### **Frontend Production**
```bash
# Build for production
cd cluster-api-ui
npm run build

# Serve with nginx or any static file server
# Built files will be in dist/ directory
```

---

## 📊 **8. Verify Database Content**

### **Quick Database Check**
```bash
cd cluster-api-backend
sqlite3 cluster_api.db "SELECT name, subscription_tier FROM organizations;"
sqlite3 cluster_api.db "SELECT email, role FROM users;"
sqlite3 cluster_api.db "SELECT COUNT(*) as cluster_count FROM clusters;"
```

### **Expected Output**
```
Organizations:
Sify Technologies|enterprise
Demo Company|professional  
Tech Startup|free

Users:
admin@sifytechnologies.com|super_admin
admin@example.com|org_admin
founder@techstartup.com|org_admin
...

Cluster Count: 2 (sample clusters)
```

---

## ✅ **Success Checklist**

- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:5173
- [ ] Database initialized with sample data
- [ ] Can login with demo accounts
- [ ] Dashboard shows organization data
- [ ] Cluster creation wizard works
- [ ] Cluster management operations work
- [ ] No console errors in browser

**🎉 Your multi-tenant Cluster-API Management Console is now fully deployed and ready to use!**

