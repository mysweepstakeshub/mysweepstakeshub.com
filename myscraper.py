import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

# The database file the website looks for
DB_FILE = 'sweepstakes_db.json'

def get_category(title):
    """The Sorting Hat: Decides the category based on words in the title"""
    t = title.lower()
    if any(word in t for word in ['cash', '$', 'gift card', 'visa', 'mastercard', 'money']):
        return 'cash'
    if any(word in t for word in ['car', 'truck', 'suv', 'vehicle', 'ford', 'tesla', 'toyota']):
        return 'cars'
    if any(word in t for word in ['trip', 'vacation', 'travel', 'cruise', 'hotel', 'flight']):
        return 'travel'
    if any(word in t for word in ['daily', 'every day', '24 hours']):
        return 'daily'
    if any(word in t for word in ['iphone', 'tv', 'laptop', 'computer', 'electronics', 'apple']):
        return 'electronics'
    return 'general'

def scrape_sweeps():
    all_sweeps = []
    
    # List of sites to scrape (You can add more URLs here)
    sources = [
        {'name': 'ContestGirl', 'url': 'https://www.contestgirl.com/hot-sweepstakes.php'},
        {'name': 'InfiniteSweeps', 'url': 'https://infinitesweeps.com/new/'}
    ]

    for source in sources:
        try:
            print(f"Scraping {source['name']}...")
            response = requests.get(source['url'], timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')

            # This looks for links - adjust based on specific site HTML
            for link in soup.find_all('a', href=True):
                title = link.text.strip()
                url = link['href']

                # Only grab links that look like actual prizes
                if len(title) > 15 and (url.startswith('http') or url.startswith('/')):
                    # 1. Clean up the URL if it's relative
                    if url.startswith('/'):
                        url = source['url'].split('.com')[0] + '.com' + url
                    
                    # 2. RUN THE SORTING HAT
                    category = get_category(title)

                    # 3. Create the entry
                    entry = {
                        "title": title,
                        "url": url,
                        "category": category,
                        "source": source['name'],
                        "date_added": datetime.now().strftime("%Y-%m-%d")
                    }
                    all_sweeps.append(entry)

        except Exception as e:
            print(f"Error scraping {source['name']}: {e}")

    return all_sweeps

def save_to_db(data):
    # Save the list to your JSON file
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=4)
    print(f"Successfully saved {len(data)} sweepstakes to {DB_FILE}")

if __name__ == "__main__":
    results = scrape_sweeps()
    if results:
        save_to_db(results)
