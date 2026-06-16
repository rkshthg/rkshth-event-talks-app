# BigQuery Release Notes Tracker

A modern, responsive web application that fetches, parses, searches, and tweets updates from the Google Cloud BigQuery release notes XML feed.

## 🚀 Features

*   **Live Feed Parser**: Dynamically ingests the BigQuery Atom feed and decomposes entries into individual granular updates.
*   **Search & Tag Filters**: Instantly filters release notes by category types (`Features`, `Changes`, `Breaking`, `Issues`, `Announcements`) and keyword queries.
*   **X (Twitter) Sharing Intent**: Select single or multiple updates to compose and post updates to X.
*   **Smart Character Fitting**: Automatics truncation and formatting to ensure your drafted tweets stay within X's 280-character limit.
*   **Glassmorphic UI**: Beautiful responsive dark mode styling featuring visual glows, skeletons, responsive grid cards, and animated success toasts.
*   **Caching & Resiliency**: Stores updates in memory to minimize load, with fallback recovery if the remote feed becomes unreachable.

---

## 🛠️ Prerequisites & Installation

Ensure you have **Python 3.x** installed.

1. **Install Python dependencies**:
   ```bash
   pip install flask requests
   ```

2. **Navigate to the application root**:
   ```bash
   cd release_notes_app
   ```

3. **Start the Flask server**:
   ```bash
   python app.py
   ```

4. **Open in your browser**:
   Navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 📂 Project Structure

```text
├── release_notes_app/
│   ├── app.py              # Flask server and XML feed parser
│   ├── templates/
│   │   └── index.html      # Glassmorphic UI dashboard structure
│   └── static/
│       ├── app.js          # API calls, filters, and Tweet composition state
│       └── styles.css      # Dark mode styling tokens and CSS animations
├── news.txt                # Workspace backup file containing world news
├── summary.txt             # Workspace backup summary file
├── .gitignore              # Configured Git exclusions
└── README.md               # Project guide and documentation
```

---

## 💻 Tech Stack

*   **Backend**: Python, Flask (Routes/API), requests (HTTP client), xml.etree.ElementTree (XML parser)
*   **Frontend**: Plain HTML5, Vanilla CSS3 (Custom transitions, gradients, glassmorphism), Vanilla JavaScript ES6 (Fetch API, DOM events, state sets)
*   **Integrations**: X (Twitter) Web Intents sharing API
