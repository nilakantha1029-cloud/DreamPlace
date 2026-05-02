# ✈ Dream Place — Travel Booking Platform

A full-stack travel booking web app with:
- **Landing page** (destinations, packages, about, contact)
- **Login & Sign Up** pages with real validation
- **User Dashboard** — browse packages, book trips, manage bookings, edit profile
- **Python / Flask backend** with PostgreSQL database
- **JWT authentication**

---

## 📁 Project Structure

```
dreamplace/
│
├── backend/
│   ├── app.py              # Flask app — all API routes + models
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variable template
│
├── frontend/
│   ├── index.html          # Landing page
│   ├── login.html          # Login page
│   ├── signup.html         # Sign up page
│   ├── dashboard.html      # User dashboard (protected)
│   ├── css/
│   │   └── style.css       # Complete stylesheet
│   └── js/
│       ├── api.js          # Centralised API helper
│       ├── main.js         # Landing page JS
│       ├── auth.js         # Auth utilities
│       └── dashboard.js    # Dashboard JS
│
└── README.md
```

---

## 🗄 Database Schema

```
users           — id, full_name, email, phone, password_hash, created_at
destinations    — id, name, country, region, flag, image_url, description, rating, base_price, nights
packages        — id, destination_id, name, category, description, price_per_person, nights, includes, image_url, is_featured, badge
bookings        — id, user_id, package_id, travellers, travel_date, total_amount, status, special_req, booked_at
```

---

## 🚀 Setup & Run

### 1. PostgreSQL Database

```bash
# Start PostgreSQL, then:
psql -U postgres
CREATE DATABASE dreamplace;
\q
```

### 2. Backend (Python / Flask)

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set your DATABASE_URL and secret keys

# Run the server (auto-creates tables + seeds data on first run)
python app.py
# Server starts at http://localhost:5000
```

### 3. Frontend

Open `frontend/index.html` in your browser — or serve with any static server:

```bash
# Using Python
cd frontend
python -m http.server 8080
# Open http://localhost:8080

# Using VS Code Live Server extension — right-click index.html → Open with Live Server
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Log in, receive JWT |
| POST | `/api/auth/logout` | ✅ | Invalidate token |
| GET | `/api/user/profile` | ✅ | Get profile |
| PUT | `/api/user/profile` | ✅ | Update profile |
| GET | `/api/destinations` | — | List destinations (`?region=asia`) |
| GET | `/api/packages` | — | List packages (`?category=honeymoon`) |
| GET | `/api/packages/:id` | — | Single package |
| POST | `/api/bookings` | ✅ | Create booking |
| GET | `/api/bookings` | ✅ | User's bookings |
| DELETE | `/api/bookings/:id` | ✅ | Cancel booking |
| GET | `/api/dashboard/stats` | ✅ | Dashboard stats |
| GET | `/api/health` | — | Health check |

---

## 🎨 Frontend Pages

### Landing Page (`index.html`)
- Fixed navbar (transparent → solid on scroll), hamburger menu on mobile
- Hero section with floating trust badges + animated scroll indicator
- Animated stats counters (10,000+ travellers, 52+ destinations, 15+ years)
- "How It Works" 4-step guide
- Destinations grid — loaded live from API, falls back to static cards
- Featured packages — loaded live from API
- About Us section with floating badge
- Testimonials grid (3 verified reviews)
- Contact form with client-side validation
- Newsletter signup + full footer

### Login (`login.html`)
- Split-screen layout (hero image left, form right)
- Email + password with show/hide toggle
- Remember me checkbox
- Real-time field validation (blur + submit)
- JWT stored in localStorage on success → redirect to dashboard
- Social login placeholders (Google, Facebook)

### Sign Up (`signup.html`)
- Split-screen with Maldives background
- First name, last name, email, phone, password, confirm password
- Live password strength meter (Weak → Strong)
- Terms & privacy consent checkbox
- Full client-side validation before API call
- On success: JWT saved, redirect to dashboard

### Dashboard (`dashboard.html`)
- **Overview** — 4 stat cards (total bookings, confirmed, cancelled, spent), recent bookings list, explore CTA
- **Book Travel** — packages grid with category filter tabs; each card has "Book Now" button
- **My Bookings** — full booking history with status badges; cancel confirmed bookings
- **My Profile** — edit name + phone; avatar initials auto-generated from name
- Sidebar with user avatar initials, collapsible on mobile (hamburger)
- All data loaded live from Flask API with JWT

---

## 🔐 Auth Flow

1. User signs up → `POST /api/auth/register` → receives JWT token
2. Token stored in `localStorage` as `dp_token`
3. All protected API calls include `Authorization: Bearer <token>` header
4. Dashboard page redirects to login if no token found
5. 401 responses auto-redirect to login and clear localStorage
6. Logout calls `POST /api/auth/logout` (adds token to server blocklist) then clears localStorage

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3 (Grid, Flexbox, CSS Variables), Vanilla JS (ES6+) |
| Icons | Font Awesome 6.5 (CDN) |
| Fonts | Playfair Display + Inter (Google Fonts) |
| Images | Unsplash (CDN) |
| Backend | Python 3.11+, Flask 3.0 |
| ORM | Flask-SQLAlchemy |
| Auth | Flask-JWT-Extended (JWT tokens) |
| Password | Flask-Bcrypt (bcrypt hashing) |
| Database | PostgreSQL 15+ |
| CORS | Flask-CORS |

---

## 📋 Features Checklist

| Feature | Status |
|---------|--------|
| Landing page with all sections | ✅ |
| About Us section on landing | ✅ |
| Contact Us section with form | ✅ |
| Login page with validation | ✅ |
| Sign Up page with validation | ✅ |
| Password strength meter | ✅ |
| JWT authentication | ✅ |
| Protected dashboard route | ✅ |
| Book travel packages | ✅ |
| Package category filter | ✅ |
| Booking modal with date + travellers | ✅ |
| My Bookings list | ✅ |
| Cancel booking | ✅ |
| Dashboard stats cards | ✅ |
| Profile editor | ✅ |
| Logout with token invalidation | ✅ |
| PostgreSQL database | ✅ |
| Auto seed on first run | ✅ |
| Responsive design (mobile/tablet) | ✅ |
| API fallback (offline-friendly) | ✅ |

---

## 👤 Test Account

After running the backend for the first time, register a new account via the Sign Up page — no pre-seeded users are created for security.

---

© 2025 Dream Place Travel Pvt. Ltd.