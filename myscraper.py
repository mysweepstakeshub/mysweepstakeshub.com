import json
import os
from datetime import datetime

# 1. SETUP - Define your file names
DB_FILE = 'sweepstakes_db.json'

def run_scraper():
    print("Checking for new sweepstakes...")

    # 2. THE DATA - This is where the "scraped" info goes.
    # In a real scenario, you'd add logic here to pull from a website.
    # For now, this creates a sample entry to prove the automation works!
    new_entry = {
        "title": "GitHub Automation Giveaway",
        "url": "https://github.com",
        "description": "An entry created automatically by GitHub Actions!",
        "date_added": datetime.now().strftime("%Y-%m-%d"),
        "status": "approved"  # This is the 'Auto-Approve' part
    }

    # 3. LOAD EXISTING DATA
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []
    else:
        data = []

    # 4. AUTO-APPROVE & SAVE
    # We add the new entry directly to the main database
    data.append(new_entry)
    
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=4)
    
    print(f"Success! Added 1 new entry to {DB_FILE} and auto-approved it.")

if __name__ == "__main__":
    run_scraper()
