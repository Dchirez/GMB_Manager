"""
SQLAlchemy models for GMB Manager
Tables: User, Fiche, Avis, Publication
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()


class User(db.Model):
    """
    Utilisateur authentifié via Google OAuth 2.0
    """
    __tablename__ = 'users'

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    google_id = db.Column(db.String(255), unique=True, nullable=False)  # Google sub
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    google_access_token = db.Column(db.Text, nullable=True)
    google_refresh_token = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    fiches = db.relationship('Fiche', backref='owner', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'user_id': self.google_id,
            'email': self.email,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<User {self.email}>'


class Fiche(db.Model):
    """
    Fiche Google My Business
    """
    __tablename__ = 'fiches'

    id = db.Column(db.String(255), primary_key=True, default=lambda: str(uuid.uuid4()))  # UUID or Google location ID
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    nom = db.Column(db.String(255), nullable=False)
    categorie = db.Column(db.String(255), nullable=True)
    adresse = db.Column(db.Text, nullable=True)
    telephone = db.Column(db.String(255), nullable=True)
    site_web = db.Column(db.String(255), nullable=True)
    horaires = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)
    score = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    avis = db.relationship('Avis', backref='fiche', lazy=True, cascade='all, delete-orphan')
    publications = db.relationship('Publication', backref='fiche', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'nom': self.nom,
            'categorie': self.categorie,
            'adresse': self.adresse or '',
            'telephone': self.telephone or '',
            'site_web': self.site_web or '',
            'horaires': self.horaires or '',
            'description': self.description or '',
            'score': self.score
        }

    def __repr__(self):
        return f'<Fiche {self.nom}>'


class Avis(db.Model):
    """
    Avis client sur une fiche
    """
    __tablename__ = 'avis'

    id = db.Column(db.String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    fiche_id = db.Column(db.String(255), db.ForeignKey('fiches.id'), nullable=False)
    auteur = db.Column(db.String(255), nullable=False)
    note = db.Column(db.Integer, nullable=False)  # 1-5
    date = db.Column(db.Date, nullable=False)
    commentaire = db.Column(db.Text, nullable=False)
    reponse = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'auteur': self.auteur,
            'note': self.note,
            'date': self.date.isoformat() if self.date else None,
            'commentaire': self.commentaire,
            'reponse': self.reponse
        }

    def __repr__(self):
        return f'<Avis {self.id} on {self.fiche_id}>'


class Publication(db.Model):
    """
    Publication sur une fiche GMB
    """
    __tablename__ = 'publications'

    id = db.Column(db.String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    fiche_id = db.Column(db.String(255), db.ForeignKey('fiches.id'), nullable=False)
    titre = db.Column(db.String(255), nullable=False)
    contenu = db.Column(db.Text, nullable=False)
    date = db.Column(db.Date, nullable=False)
    statut = db.Column(db.String(50), default='publié')  # publié, brouillon, etc
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'titre': self.titre,
            'contenu': self.contenu,
            'date': self.date.isoformat() if self.date else None,
            'statut': self.statut
        }

    def __repr__(self):
        return f'<Publication {self.titre}>'
