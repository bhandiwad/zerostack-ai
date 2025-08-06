import os
import sys
from sqlalchemy import text

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from main import app, db

def normalize_agent_statuses():
    """Connects to the database and normalizes all agent statuses to lowercase."""
    with app.app_context():
        try:
            # Use raw SQL to bypass ORM's enum conversion on read
            result = db.session.execute(text('SELECT id, status FROM agents')).fetchall()
            agents_to_update = []

            for agent_id, status in result:
                if not isinstance(status, str):
                    continue
                
                # Clean and normalize the status
                cleaned_status = status.strip('"').lower()
                
                # Only update if the status has changed
                if cleaned_status != status:
                    agents_to_update.append({'id': agent_id, 'status': cleaned_status})
            
            if not agents_to_update:
                print("No agent statuses to normalize. Database is already in good shape.")
                return

            print(f"Found {len(agents_to_update)} agents with non-normalized status. Updating now...")
            # Use parameterized queries for the update
            update_query = text("UPDATE agents SET status = :status WHERE id = :id")
            db.session.execute(update_query, agents_to_update)
            
            db.session.commit()
            print("Successfully normalized agent statuses in the database.")

        except Exception as e:
            print(f"An error occurred while normalizing agent statuses: {e}")
            db.session.rollback()

if __name__ == '__main__':
    normalize_agent_statuses()

