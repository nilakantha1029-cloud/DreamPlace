"""
Dream Place Travel Agency — Flask Backend
Database: PostgreSQL via SQLAlchemy
Auth:      JWT tokens (flask-jwt-extended)
"""

import os
from datetime import datetime, timedelta, date
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required,
    get_jwt_identity, get_jwt
)
from dotenv import load_dotenv

load_dotenv()

# ─────────────────────────────────────────
#  App & config
# ─────────────────────────────────────────
app = Flask(__name__)

app.config['SECRET_KEY']                    = os.getenv('SECRET_KEY', 'dreamplace-secret-2025-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI']       = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/dreamplace'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY']                = os.getenv('JWT_SECRET_KEY', 'jwt-secret-dreamplace-2025')
app.config['JWT_ACCESS_TOKEN_EXPIRES']      = timedelta(hours=24)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")

# Extensions
db      = SQLAlchemy(app)
bcrypt  = Bcrypt(app)
cors    = CORS(app, resources={r"/api/*": {"origins": "*"}})
jwt     = JWTManager(app)

# Token blocklist (in-memory; swap to Redis/DB in production)
BLOCKED_TOKENS = set()

@jwt.token_in_blocklist_loader
def check_if_revoked(jwt_header, jwt_payload):
    return jwt_payload["jti"] in BLOCKED_TOKENS

# ─────────────────────────────────────────
#  Models
# ─────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'users'

    id           = db.Column(db.Integer, primary_key=True)
    full_name    = db.Column(db.String(120), nullable=False)
    email        = db.Column(db.String(200), unique=True, nullable=False)
    phone        = db.Column(db.String(20))
    password_hash= db.Column(db.Text, nullable=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    bookings     = db.relationship('Booking', backref='user', lazy='dynamic')

    def set_password(self, raw):
        self.password_hash = bcrypt.generate_password_hash(raw).decode('utf-8')

    def check_password(self, raw):
        return bcrypt.check_password_hash(self.password_hash, raw)

    def to_dict(self):
        return {
            'id':        self.id,
            'full_name': self.full_name,
            'email':     self.email,
            'phone':     self.phone or '',
            'member_since': self.created_at.strftime('%B %Y')
        }


class Destination(db.Model):
    __tablename__ = 'destinations'

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(120), nullable=False)
    country     = db.Column(db.String(100), nullable=False)
    region      = db.Column(db.String(50), nullable=False)
    flag        = db.Column(db.String(10))
    image_url   = db.Column(db.Text)
    description = db.Column(db.Text)
    rating      = db.Column(db.Numeric(2, 1), default=4.5)
    base_price  = db.Column(db.Integer, nullable=False)   # INR per person
    nights      = db.Column(db.Integer, default=5)

    packages    = db.relationship('Package', backref='destination', lazy='dynamic')

    def to_dict(self):
        return {
            'id':          self.id,
            'name':        self.name,
            'country':     self.country,
            'region':      self.region,
            'flag':        self.flag or '',
            'image_url':   self.image_url or '',
            'description': self.description or '',
            'rating':      float(self.rating),
            'base_price':  self.base_price,
            'nights':      self.nights,
        }


class Package(db.Model):
    __tablename__ = 'packages'

    id              = db.Column(db.Integer, primary_key=True)
    destination_id  = db.Column(db.Integer, db.ForeignKey('destinations.id'), nullable=False)
    name            = db.Column(db.String(200), nullable=False)
    category        = db.Column(db.String(50), nullable=False)   # honeymoon, family, adventure, luxury, group
    description     = db.Column(db.Text)
    price_per_person= db.Column(db.Integer, nullable=False)
    nights          = db.Column(db.Integer, default=5)
    includes        = db.Column(db.Text)     # comma-separated
    image_url       = db.Column(db.Text)
    is_featured     = db.Column(db.Boolean, default=False)
    badge           = db.Column(db.String(80))

    bookings        = db.relationship('Booking', backref='package', lazy='dynamic')

    def to_dict(self):
        dest = self.destination
        return {
            'id':               self.id,
            'destination_id':   self.destination_id,
            'destination_name': dest.name if dest else '',
            'destination_flag': dest.flag if dest else '',
            'name':             self.name,
            'category':         self.category,
            'description':      self.description or '',
            'price_per_person': self.price_per_person,
            'nights':           self.nights,
            'includes':         [i.strip() for i in (self.includes or '').split(',') if i.strip()],
            'image_url':        self.image_url or '',
            'is_featured':      self.is_featured,
            'badge':            self.badge or '',
        }


class Booking(db.Model):
    __tablename__ = 'bookings'

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    package_id   = db.Column(db.Integer, db.ForeignKey('packages.id'), nullable=False)
    travellers   = db.Column(db.Integer, default=1)
    travel_date  = db.Column(db.Date, nullable=False)
    total_amount = db.Column(db.Integer, nullable=False)
    status       = db.Column(db.String(20), default='confirmed')  # confirmed, cancelled, completed
    special_req  = db.Column(db.Text)
    booked_at    = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        pkg  = self.package
        dest = pkg.destination if pkg else None
        return {
            'id':            self.id,
            'package_id':    self.package_id,
            'package_name':  pkg.name if pkg else '',
            'destination':   dest.name if dest else '',
            'flag':          dest.flag if dest else '',
            'image_url':     pkg.image_url if pkg else '',
            'category':      pkg.category if pkg else '',
            'travellers':    self.travellers,
            'travel_date':   self.travel_date.strftime('%d %b %Y'),
            'nights':        pkg.nights if pkg else 0,
            'total_amount':  self.total_amount,
            'status':        self.status,
            'special_req':   self.special_req or '',
            'booked_at':     self.booked_at.strftime('%d %b %Y'),
        }


# ─────────────────────────────────────────
#  Seed helper
# ─────────────────────────────────────────
def seed_data():
    """Seed destinations and packages if tables are empty."""
    if Destination.query.count() > 0:
        return

    destinations = [
        Destination(name='Bali', country='Indonesia', region='asia', flag='🇮🇩',
            image_url='https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
            description='Island of the Gods — temples, rice terraces, surf and spiritual retreats.',
            rating=4.9, base_price=45000, nights=7),
        Destination(name='Maldives', country='Maldives', region='asia', flag='🇲🇻',
            image_url='https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80',
            description='Crystal lagoons, overwater villas and untouched coral reefs.',
            rating=4.9, base_price=125000, nights=5),
        Destination(name='Paris', country='France', region='europe', flag='🇫🇷',
            image_url='https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
            description='The City of Light — Eiffel, art, haute cuisine and romance.',
            rating=4.8, base_price=95000, nights=6),
        Destination(name='Santorini', country='Greece', region='europe', flag='🇬🇷',
            image_url='https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
            description='Blue-domed churches, caldera sunsets and volcanic beaches.',
            rating=4.8, base_price=115000, nights=7),
        Destination(name='Dubai', country='UAE', region='middleeast', flag='🇦🇪',
            image_url='https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
            description='Futuristic skyline, desert safari, luxury malls and gold souks.',
            rating=4.7, base_price=35000, nights=4),
        Destination(name='Tokyo', country='Japan', region='asia', flag='🇯🇵',
            image_url='https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80',
            description='Where ancient shrines meet neon districts and world-class ramen.',
            rating=4.8, base_price=85000, nights=8),
        Destination(name='Kerala', country='India', region='asia', flag='🇮🇳',
            image_url='https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
            description='God\'s Own Country — backwaters, spice gardens and Ayurveda.',
            rating=4.7, base_price=18000, nights=5),
        Destination(name='Swiss Alps', country='Switzerland', region='europe', flag='🇨🇭',
            image_url='https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=800&q=80',
            description='Snow-capped peaks, glacier express trains and alpine villages.',
            rating=4.9, base_price=185000, nights=8),
    ]
    db.session.add_all(destinations)
    db.session.flush()   # get IDs

    packages = [
        Package(destination_id=destinations[0].id, name='Bali Romance Package',
            category='honeymoon', price_per_person=89999, nights=7,
            description='Private pool villa, couples spa, sunset dinner in Ubud jungle.',
            includes='Return Flights,Private Pool Villa,Couples Spa,Breakfast Daily,Sunset Cruise,Private Transfers',
            image_url='https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
            is_featured=False, badge=''),
        Package(destination_id=destinations[0].id, name='Bali Volcano & Surf',
            category='adventure', price_per_person=62000, nights=6,
            description='Mount Batur sunrise trek, white-water rafting, surf lessons and cooking class.',
            includes='Return Flights,Volcano Trek,Surf Lessons,River Rafting,Cooking Class,4-Star Hotel',
            image_url='https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80',
            is_featured=False, badge=''),
        Package(destination_id=destinations[1].id, name='Maldives Overwater Escape',
            category='honeymoon', price_per_person=245999, nights=5,
            description='Overwater villa, private beach dinner, snorkelling over coral reefs.',
            includes='Return Flights,Overwater Villa,Full Board,Sunset Cruise,Snorkelling Trip,Speed Boat Transfers',
            image_url='https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=80',
            is_featured=True, badge='⭐ Best Seller'),
        Package(destination_id=destinations[2].id, name='Paris City of Love',
            category='honeymoon', price_per_person=95000, nights=6,
            description='Eiffel Tower, Seine river cruise, Versailles and Michelin dining.',
            includes='Return Flights,4-Star Hotel,Breakfast Daily,Seine Cruise,Eiffel Tower Access,Airport Transfers',
            image_url='https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=600&q=80',
            is_featured=False, badge=''),
        Package(destination_id=destinations[3].id, name='Santorini Sunset Escape',
            category='honeymoon', price_per_person=220000, nights=6,
            description='Caldera-view suites, catamaran cruise, wine tasting in Assyrtiko vineyards.',
            includes='Return Flights,Caldera Suite,Breakfast & Dinner,Catamaran Cruise,Wine Tasting,Airport Transfers',
            image_url='https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80',
            is_featured=False, badge=''),
        Package(destination_id=destinations[4].id, name='Dubai Ultra Luxury',
            category='luxury', price_per_person=350000, nights=4,
            description='Burj Al Arab stay, helicopter city tour, Michelin-starred dining.',
            includes='Business Class Flights,7-Star Hotel,Helicopter Tour,Michelin Dining,Desert Safari,Luxury Car',
            image_url='https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80',
            is_featured=False, badge='👑 Ultra Luxury'),
        Package(destination_id=destinations[6].id, name='Kerala Family Discovery',
            category='family', price_per_person=18999, nights=5,
            description='Houseboat on Alleppey backwaters, Munnar tea estates, wildlife safari.',
            includes='Flights Included,Houseboat Stay,All Meals,Wildlife Safari,AC Transport,Local Guide',
            image_url='https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80',
            is_featured=False, badge=''),
        Package(destination_id=destinations[7].id, name='Swiss Alps Explorer',
            category='adventure', price_per_person=185999, nights=7,
            description='Jungfraujoch, glacier hiking, Interlaken paragliding, Glacier Express.',
            includes='Return Flights,Jungfraujoch Trip,Paragliding,Swiss Travel Pass,Alpine Hotels,English Guide',
            image_url='https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=600&q=80',
            is_featured=False, badge=''),
    ]
    db.session.add_all(packages)
    db.session.commit()
    print("✅ Seed data inserted.")


# ─────────────────────────────────────────
#  Auth Routes
# ─────────────────────────────────────────
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    full_name = data.get('full_name', '').strip()
    email     = data.get('email', '').strip().lower()
    phone     = data.get('phone', '').strip()
    password  = data.get('password', '')

    if not full_name or not email or not password:
        return jsonify({'error': 'Full name, email and password are required.'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters.'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists.'}), 409

    user = User(full_name=full_name, email=email, phone=phone)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'message': 'Account created successfully!', 'token': token, 'user': user.to_dict()}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data     = request.get_json(silent=True) or {}
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password.'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({'message': 'Login successful!', 'token': token, 'user': user.to_dict()}), 200


@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    BLOCKED_TOKENS.add(jti)
    return jsonify({'message': 'Logged out successfully.'}), 200


# ─────────────────────────────────────────
#  User Routes
# ─────────────────────────────────────────
@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': 'User not found.'}), 404
    return jsonify(user.to_dict()), 200


@app.route('/api/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user = User.query.get(int(get_jwt_identity()))
    data = request.get_json(silent=True) or {}
    if data.get('full_name'): user.full_name = data['full_name'].strip()
    if data.get('phone'):     user.phone     = data['phone'].strip()
    db.session.commit()
    return jsonify({'message': 'Profile updated.', 'user': user.to_dict()}), 200


# ─────────────────────────────────────────
#  Destination Routes
# ─────────────────────────────────────────
@app.route('/api/destinations', methods=['GET'])
def get_destinations():
    region = request.args.get('region')
    q      = Destination.query
    if region and region != 'all':
        q = q.filter_by(region=region)
    dests = q.order_by(Destination.rating.desc()).all()
    return jsonify([d.to_dict() for d in dests]), 200


# ─────────────────────────────────────────
#  Package Routes
# ─────────────────────────────────────────
@app.route('/api/packages', methods=['GET'])
def get_packages():
    category = request.args.get('category')
    q = Package.query
    if category and category != 'all':
        q = q.filter_by(category=category)
    pkgs = q.order_by(Package.is_featured.desc(), Package.price_per_person).all()
    return jsonify([p.to_dict() for p in pkgs]), 200


@app.route('/api/packages/<int:pkg_id>', methods=['GET'])
def get_package(pkg_id):
    pkg = Package.query.get_or_404(pkg_id)
    return jsonify(pkg.to_dict()), 200


# ─────────────────────────────────────────
#  Booking Routes
# ─────────────────────────────────────────
@app.route('/api/bookings', methods=['POST'])
@jwt_required()
def create_booking():
    user_id = int(get_jwt_identity())
    data    = request.get_json(silent=True) or {}

    pkg_id      = data.get('package_id')
    travellers  = int(data.get('travellers', 1))
    travel_date = data.get('travel_date')   # YYYY-MM-DD
    special_req = data.get('special_req', '')

    if not pkg_id or not travel_date:
        return jsonify({'error': 'Package ID and travel date are required.'}), 400

    try:
        td = date.fromisoformat(travel_date)
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    if td <= date.today():
        return jsonify({'error': 'Travel date must be in the future.'}), 400

    pkg = Package.query.get(pkg_id)
    if not pkg:
        return jsonify({'error': 'Package not found.'}), 404

    if travellers < 1 or travellers > 50:
        return jsonify({'error': 'Travellers must be between 1 and 50.'}), 400

    total = pkg.price_per_person * travellers

    booking = Booking(
        user_id=user_id,
        package_id=pkg_id,
        travellers=travellers,
        travel_date=td,
        total_amount=total,
        status='confirmed',
        special_req=special_req
    )
    db.session.add(booking)
    db.session.commit()
    return jsonify({'message': 'Booking confirmed!', 'booking': booking.to_dict()}), 201


@app.route('/api/bookings', methods=['GET'])
@jwt_required()
def get_bookings():
    user_id  = int(get_jwt_identity())
    bookings = Booking.query.filter_by(user_id=user_id)\
                            .order_by(Booking.booked_at.desc()).all()
    return jsonify([b.to_dict() for b in bookings]), 200


@app.route('/api/bookings/<int:booking_id>', methods=['DELETE'])
@jwt_required()
def cancel_booking(booking_id):
    user_id = int(get_jwt_identity())
    booking = Booking.query.filter_by(id=booking_id, user_id=user_id).first()
    if not booking:
        return jsonify({'error': 'Booking not found.'}), 404
    if booking.status == 'cancelled':
        return jsonify({'error': 'Booking already cancelled.'}), 400
    booking.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Booking cancelled.'}), 200


# ─────────────────────────────────────────
#  Dashboard stats
# ─────────────────────────────────────────
@app.route('/api/dashboard/stats', methods=['GET'])
@jwt_required()
def dashboard_stats():
    user_id  = int(get_jwt_identity())
    bookings = Booking.query.filter_by(user_id=user_id).all()
    total      = len(bookings)
    confirmed  = sum(1 for b in bookings if b.status == 'confirmed')
    cancelled  = sum(1 for b in bookings if b.status == 'cancelled')
    spent      = sum(b.total_amount for b in bookings if b.status != 'cancelled')
    return jsonify({
        'total_bookings':    total,
        'confirmed':         confirmed,
        'cancelled':         cancelled,
        'total_spent':       spent,
    }), 200


# ─────────────────────────────────────────
#  Health check
# ─────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'app': 'Dream Place API', 'version': '1.0.0'}), 200


# ─────────────────────────────────────────
#  Error handlers
# ─────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Resource not found.'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error.'}), 500


# ─────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_data()
    app.run(debug=True, host='0.0.0.0', port=5000)