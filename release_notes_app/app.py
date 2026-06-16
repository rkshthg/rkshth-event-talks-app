from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
import re
from datetime import datetime

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_release_notes():
    try:
        # Fetch the feed with a reasonable timeout
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        xml_data = response.content
        
        # Parse XML
        root = ET.fromstring(xml_data)
        # Atom Namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        updates = []
        update_id_counter = 0
        
        for entry in root.findall('atom:entry', ns):
            date_str = entry.find('atom:title', ns).text.strip()  # e.g., "June 15, 2026"
            link = entry.find('atom:link', ns).attrib.get('href', '')
            
            # Convert date to standard ISO format (YYYY-MM-DD) for sorting/filtering
            try:
                parsed_date = datetime.strptime(date_str, "%B %d, %Y")
                iso_date = parsed_date.strftime("%Y-%m-%d")
            except Exception:
                iso_date = ""
                
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ''
            
            if content_html:
                # Release notes contain multiple update sections separated by <h3>Type</h3>
                # Use regex split to capture the heading (Type) and the content block following it
                parts = re.split(r'<h3>(.*?)</h3>', content_html)
                
                # parts[0] is anything before the first <h3> (usually empty)
                # parts[1] is the type (e.g., "Feature")
                # parts[2] is the HTML content block
                for i in range(1, len(parts), 2):
                    update_type = parts[i].strip()
                    update_content = parts[i+1].strip() if i+1 < len(parts) else ''
                    
                    # Convert HTML content to clean plain text for pre-populating tweets
                    # Remove HTML tags
                    plain_text = re.sub(r'<[^>]+>', '', update_content).strip()
                    # Collapse multiple whitespaces and newlines
                    plain_text = re.sub(r'\s+', ' ', plain_text)
                    
                    # Generate a unique update ID
                    update_id = f"upd_{update_id_counter}"
                    update_id_counter += 1
                    
                    updates.append({
                        "id": update_id,
                        "date": date_str,
                        "iso_date": iso_date,
                        "type": update_type,
                        "content_html": update_content,
                        "content_text": plain_text,
                        "link": link
                    })
                    
        return updates, None
    except Exception as e:
        return [], str(e)

# Simple in-memory cache
cached_notes = []
last_fetched = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes', methods=['GET'])
def get_notes():
    global cached_notes, last_fetched
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or not cached_notes:
        notes, error = parse_release_notes()
        if error:
            if cached_notes:
                return jsonify({
                    "notes": cached_notes,
                    "last_fetched": last_fetched.strftime("%Y-%m-%d %H:%M:%S") if last_fetched else None,
                    "warning": f"Could not refresh: {error}. Showing cached data."
                })
            else:
                return jsonify({"error": error, "notes": []}), 500
        
        cached_notes = notes
        last_fetched = datetime.now()
        
    return jsonify({
        "notes": cached_notes,
        "last_fetched": last_fetched.strftime("%Y-%m-%d %H:%M:%S") if last_fetched else None
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
