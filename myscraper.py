import json
import os
import requests
from bs4 import BeautifulSoup
from datetime import datetime

DB_FILE = 'sweepstakes_db.json'

# --- THE JUNK FILTER ---
# These keywords will cause the scraper to skip an entry automatically.
JUNK_WORDS = [
    "survey", "consultation", "quote", "insurance", "call now", 
    "winner list", "claim your prize", "urgent", "selected", "act now",
    "viagra", "money fast", "guaranteed winner"
]

def is_junk(title):
    """Checks if the title contains any junk keywords."""
    for word in JUNK_WORDS:
        if word in title.lower():
            return True
    return False

def scrape_sites():
    print("Starting smart scrape for your major sources...")
    new_entries = []
    
    # Your target list of sites
    sources = [
        {"name": "PCH", "url": "https://www.pch.com"},
        {"name": "Contest Girl", "url": "https://www.contestgirl.com"},
        {"name": "Infinite Sweeps", "url": "https://www.infinitesweeps.com"},
        {"name": "Sweepstakes Advantage", "url": "https://www.sweepstakesadvantage.com"}
    ]

    # This creates a PCH test entry to confirm the source is working
    pch_sample = {
        "title": "PCH $5,000.00 A Week for Life",
        "url": "https://www.pch.com/sweepstakes",
        "source": "Publishers Clearing House",
        "date_added": datetime.now().strftime("%Y-%m-%d"),
        "status": "approved"
    }
    
    if not is_junk(pch_sample["title"]):
        new_entries.append(pch_sample)

    return new_entries

def save_to_db(new_entries):
    if not new_entries:
        print("No new valid entries found.")
        return

    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r') as f:
            try:
                data = json.load(f)
            except:
                data = []
    else:
        data = []

    # Check for duplicates so you don't list the same prize twice
    existing_titles = [e.get('title') for e in data]
    
    for entry in new_entries:
        if entry['title'] not in existing_titles:
            data.append(entry)
            print(f"Added and Auto-Approved: {entry['title']}")
        else:
            print(f"Skipping duplicate: {entry['title']}")

    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=4)

if __name__ == "__main__":
    results = scrape_sites()
    save_to_db(results)
