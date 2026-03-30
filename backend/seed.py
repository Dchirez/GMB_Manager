"""
Seed script for demo data
Inserts FICHES_DEMO + AVIS_DEMO + PUBLICATIONS_DEMO into the database
Idempotent: only inserts if the database is empty
"""
from datetime import datetime, date
from models import db, User, Fiche, Avis, Publication


def seed_demo_data():
    """
    Seeds the database with demo data from FICHES_DEMO, AVIS_DEMO, PUBLICATIONS_DEMO
    Only seeds if the fiches table is empty (idempotent)
    """
    # Check if data already exists
    if Fiche.query.first() is not None:
        print("Database already seeded. Skipping.")
        return

    print("Seeding database with demo data...")

    # Create demo user
    demo_user = User(
        id='demo_user',
        email='demo@gmb-manager.local',
        name='Demo User'
    )
    db.session.add(demo_user)
    db.session.commit()
    print(f"✓ Created demo user: {demo_user.email}")

    # Fiches demo
    fiches_data = [
        {
            "id": "1",
            "nom": "Boulangerie Martin",
            "categorie": "Boulangerie",
            "adresse": "12 Rue de la Paix, Rouvroy 62320",
            "telephone": "03 21 00 00 01",
            "site_web": "",
            "horaires": "",
            "description": "",
            "score": 30
        },
        {
            "id": "2",
            "nom": "Karact'Hair",
            "categorie": "Coiffeur",
            "adresse": "5 Rue du Commerce, Rouvroy 62320",
            "telephone": "03 21 00 00 02",
            "site_web": "https://karacthair.fr",
            "horaires": "Lun-Sam 9h-19h",
            "description": "Salon de coiffure mixte",
            "score": 70
        },
        {
            "id": "3",
            "nom": "Friterie Aux Bonnes Saveurs",
            "categorie": "Restauration rapide",
            "adresse": "8 Avenue de la Liberté, Rouvroy 62320",
            "telephone": "03 21 00 00 03",
            "site_web": "",
            "horaires": "",
            "description": "",
            "score": 30
        },
        {
            "id": "4",
            "nom": "MS Automobiles",
            "categorie": "Garage automobile",
            "adresse": "22 Rue Nationale, Rouvroy 62320",
            "telephone": "03 21 00 00 04",
            "site_web": "",
            "horaires": "",
            "description": "",
            "score": 30
        }
    ]

    fiches = {}
    for data in fiches_data:
        fiche = Fiche(
            id=data['id'],
            user_id='demo_user',
            nom=data['nom'],
            categorie=data['categorie'],
            adresse=data['adresse'],
            telephone=data['telephone'],
            site_web=data['site_web'],
            horaires=data['horaires'],
            description=data['description'],
            score=data['score']
        )
        db.session.add(fiche)
        fiches[data['id']] = fiche
    db.session.commit()
    print(f"✓ Created {len(fiches)} fiches")

    # Avis demo
    avis_data = {
        "1": [
            {"id": "a1", "auteur": "Marie D.", "note": 5, "date": "2024-12-01", "commentaire": "Excellent pain, toujours frais !", "reponse": None},
            {"id": "a2", "auteur": "Jean P.", "note": 4, "date": "2024-11-15", "commentaire": "Bonnes viennoiseries mais parfois en rupture.", "reponse": None},
            {"id": "a3", "auteur": "Sophie L.", "note": 3, "date": "2024-10-20", "commentaire": "Service un peu lent le matin.", "reponse": None}
        ],
        "2": [
            {"id": "a4", "auteur": "Claire M.", "note": 5, "date": "2024-12-10", "commentaire": "Super coiffeur, résultat impeccable !", "reponse": "Merci Claire, à bientôt !"},
            {"id": "a5", "auteur": "Lucas B.", "note": 4, "date": "2024-11-28", "commentaire": "Bon accueil, tarifs raisonnables.", "reponse": None}
        ],
        "3": [
            {"id": "a6", "auteur": "Thomas R.", "note": 5, "date": "2024-12-05", "commentaire": "Les meilleures frites du coin !", "reponse": None},
            {"id": "a7", "auteur": "Emma V.", "note": 2, "date": "2024-10-01", "commentaire": "Attente trop longue.", "reponse": None}
        ],
        "4": [
            {"id": "a8", "auteur": "Pierre N.", "note": 4, "date": "2024-11-10", "commentaire": "Travail soigné, prix honnêtes.", "reponse": None}
        ]
    }

    avis_count = 0
    for fiche_id, avis_list in avis_data.items():
        for avis_item in avis_list:
            avis = Avis(
                id=avis_item['id'],
                fiche_id=fiche_id,
                auteur=avis_item['auteur'],
                note=avis_item['note'],
                date=datetime.strptime(avis_item['date'], '%Y-%m-%d').date(),
                commentaire=avis_item['commentaire'],
                reponse=avis_item['reponse']
            )
            db.session.add(avis)
            avis_count += 1
    db.session.commit()
    print(f"✓ Created {avis_count} avis")

    # Publications demo
    publications_data = {
        "1": [
            {"id": "p1", "titre": "Nouveauté : Pain au levain", "contenu": "Découvrez notre nouveau pain au levain artisanal, disponible chaque matin !", "date": "2024-12-01", "statut": "publié"},
            {"id": "p2", "titre": "Fermé le 25 décembre", "contenu": "La boulangerie sera fermée le jour de Noël. Joyeuses fêtes !", "date": "2024-11-20", "statut": "publié"}
        ],
        "2": [
            {"id": "p3", "titre": "Promotion janvier", "contenu": "-20% sur toutes les colorations en janvier !", "date": "2024-12-15", "statut": "publié"}
        ],
        "3": [],
        "4": [
            {"id": "p4", "titre": "Révision hivernale", "contenu": "Préparez votre voiture pour l'hiver : contrôle gratuit jusqu'au 31 janvier.", "date": "2024-12-10", "statut": "publié"}
        ]
    }

    publications_count = 0
    for fiche_id, publications_list in publications_data.items():
        for pub_item in publications_list:
            publication = Publication(
                id=pub_item['id'],
                fiche_id=fiche_id,
                titre=pub_item['titre'],
                contenu=pub_item['contenu'],
                date=datetime.strptime(pub_item['date'], '%Y-%m-%d').date(),
                statut=pub_item['statut']
            )
            db.session.add(publication)
            publications_count += 1
    db.session.commit()
    print(f"✓ Created {publications_count} publications")

    print("✅ Database seeding complete!")


if __name__ == '__main__':
    """
    Run this script directly:
    python seed.py

    Or from a Flask shell:
    from app import app, db
    from seed import seed_demo_data
    with app.app_context():
        seed_demo_data()
    """
    from app import app, db
    with app.app_context():
        db.create_all()
        seed_demo_data()
