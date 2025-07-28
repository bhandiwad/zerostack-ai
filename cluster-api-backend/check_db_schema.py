#!/usr/bin/env python3
"""
Script to inspect the current database schema and constraints.
"""
import os
import sys
from sqlalchemy import create_engine, inspect
from sqlalchemy.engine.reflection import Inspector

def get_db_uri():
    """Get the database URI from the Flask app config."""
    instance_path = os.path.join(os.path.dirname(__file__), 'instance')
    os.makedirs(instance_path, exist_ok=True)
    return f"sqlite:///{os.path.join(instance_path, 'app.db')}"

def main():
    """Inspect the database schema and print information about tables and constraints."""
    db_uri = get_db_uri()
    print(f"Connecting to database: {db_uri}")
    
    engine = create_engine(db_uri)
    inspector = Inspector.from_engine(engine)
    
    print("\n=== Tables in database ===")
    for table_name in inspector.get_table_names():
        print(f"\nTable: {table_name}")
        print("  Columns:")
        for column in inspector.get_columns(table_name):
            print(f"    {column['name']} ({column['type']})")
        
        print("\n  Foreign Keys:")
        for fk in inspector.get_foreign_keys(table_name):
            print(f"    {fk['name']}: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
        
        print("\n  Indexes:")
        for index in inspector.get_indexes(table_name):
            print(f"    {index['name']}: {index['column_names']} (unique: {index['unique']})")

if __name__ == "__main__":
    main()
