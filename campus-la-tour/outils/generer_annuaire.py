"""Build annuaire.js: curated services (from la-tour.ch 'Accès' page, service pages, access PDFs and
the user's own rules) + campus doctors parsed from la-tour.ch/fr/medecins detail pages."""
import json, sys, re

docs = json.load(open(sys.argv[1]))
out = sys.argv[2]
PDF = 'https://www.la-tour.ch/sites/default/files/inline-files/'
WEB = 'https://www.la-tour.ch/fr/offre-de-soins/'

def S(nom, bats, etage=None, mots=(), plan=None, note=None, url=None):
    e = {'type': 'service', 'nom': nom, 'batiments': list(bats)}
    if etage: e['etage'] = etage
    if mots: e['motsCles'] = list(mots)
    if plan: e['plan'] = PDF + plan
    if note: e['note'] = note
    if url: e['url'] = WEB + url
    return e

services = [
    # --- Urgences / admission (règles données par l'hôpital)
    S('Urgences adultes', ['URG'], 'Rez-de-chaussée', ['urgence', 'emergency', 'accident'], url='urgences'),
    S('Urgences pédiatriques', ['URG_PED'], 'Rez-de-chaussée', ['urgence enfant', 'urgences enfants'], url='urgences-pediatriques'),
    S('Admission hospitalisation', ['B1', 'B2'], None, ['admission', 'hospitalisation', 'hosp', 'entree', 'accueil'],
      note='Le bâtiment est indiqué sur votre convocation.'),
    # --- B1
    S('Maternité', ['B1'], '3e étage', ['accouchement', 'naissance', 'sage-femme', 'obstetrique'], 'ACCES_B1-Maternite_0.pdf', url='maternite'),
    S('Service d’endoscopie', ['B1'], '2e étage', ['endoscopie', 'gastroscopie', 'coloscopie', 'ciel'], 'ACCES_B1-Endoscopie_0.pdf'),
    S('Cardiologie non-invasive', ['B1'], None, ['coeur', 'echocardiographie', 'holter', 'ecg'], '31-0319_LA-TOUR_Cardiologie-non-invasive.pdf'),
    S('Unité cardio-pulmonaire', ['B1'], '1er étage', ['soins intermediaires', 'coeur', 'poumon'], 'ACCES_B1_CardioPulmonaire_0.pdf'),
    S('Hospitalisation de jour', ['B1'], '2e étage', ['hdj', 'ambulatoire', 'saleve', 'leman'], 'ACCES_SALEVE-LEMAN-HDJ_0_0.pdf'),
    S('Unité de médecine 1', ['B1'], '1er étage', ['medecine 1'], 'ACCES_B1_Medecine1_0.pdf'),
    S('Unité de médecine 2', ['B1'], '1er étage', ['medecine 2'], 'ACCES_B1_Medecine2_0.pdf'),
    S('Unité de médecine 3', ['B1'], '2e étage', ['medecine 3'], 'ACCES_B1_Medecine3_0.pdf'),
    S('Médecine interne', ['B1'], '3e étage', ['interniste'], '31-0319_LA-TOUR_UNITE-Medecine-interne.pdf', url='medecine-interne'),
    S('Pédiatrie', ['B1'], None, ['enfant', 'enfants', 'pediatre', 'bebe', 'consultations pediatriques'], '31-0319_LA-TOUR_Pediatrie.pdf', url='pediatrie'),
    S('Néonatologie', ['B1'], None, ['nouveau-ne', 'premature', 'bebe'], url='neonatologie'),
    S('Unité pluridisciplinaire', ['B1'], '2e étage', [], 'ACCES_B1-pluridisciplinaire_0.pdf'),
    S('Soins intensifs', ['B1'], 'Sous-sol', ['reanimation', 'si'], url='soins-intensifs'),
    S('Gastroentérologie (consultations)', ['B1'], None, ['gastro', 'digestif'], url='gastroenterologie'),
    S('Allergologie & immunologie', ['B1'], None, ['allergie', 'allergologue'], url='allergologie-immunologie-clinique'),
    S('Allaitement (consultation)', ['B1'], '3e étage (maternité)', ['allaitement', 'lactation'], url='accompagner-lallaitement-maternel',
      note='Les ateliers en groupe ont lieu au B12, rez-de-chaussée.'),
    # --- B2
    S('Chirurgie digestive et générale (unité)', ['B2'], '3e étage', ['chirurgie viscerale', 'digestif'], 'ACCES_B2-Chir_digestive_0.pdf'),
    S('Chirurgie orthopédique (unité)', ['B2'], '2e étage', ['ortho', 'prothese', 'hanche', 'genou'], 'ACCES_B2-Chir_orthopedique_0.pdf'),
    S('Orthopédie (consultations)', ['B2'], '1er étage', ['ortho', 'orthopediste', 'traumatologie', 'epaule', 'genou', 'hanche', 'dos'], '31-0319_LA-TOUR_UNITE-orthopedie.pdf'),
    S('Oncologie', ['B2', 'B11'], '3e étage', ['cancer', 'chimiotherapie', 'chimio', 'oncologue', 'hematologie'], '31-0319_LA-TOUR_UNITE-oncologie.pdf', url='oncologie-hematologie',
      note='À vérifier : le site indique aussi un secrétariat d’oncologie au B11.'),
    S('Radio-oncologie / radiothérapie', ['B2'], None, ['radiotherapie', 'rayons', 'cancer'], url='radio-oncologie'),
    S('Radiologie', ['B2'], 'Rez inférieur', ['radio', 'irm', 'scanner', 'ct', 'echographie', 'mammographie', 'imagerie'], '31-0319_LA-TOUR_UNITE-radiologie.pdf', url='radiologie'),
    S('Médecine nucléaire', ['B2'], 'Rez inférieur', ['scintigraphie', 'pet', 'pet-ct'], '31-0319_LA-TOUR_UNITE-Medecine-nucleaire.pdf', url='medecine-nucleaire'),
    S('Médecine du sport', ['B2'], None, ['sport', 'sportif'], '31-0319_LA-TOUR_UNITE-Medecine-sport.pdf', url='centre-de-medecine-du-sport'),
    S('Chirurgie cardiaque', ['B2'], None, ['coeur', 'pontage', 'valve']),
    S('Pathologies digestives (centre)', ['B2'], 'Rez inférieur', ['digestif', 'gastro'], url=None),
    S('Piscine (physiothérapie, aquagym, cours)', ['B2'], None, ['piscine', 'aquagym', 'aquatique']),
    # --- B11
    S('Physiothérapie', ['B11', 'B2'], 'B11 rez inférieur', ['physio', 'kine', 'kinesitherapie', 'reeducation', 'physiotherapeute'], url='physiotherapie-mouvement',
      note='La plupart des séances ont lieu au B11 (rez inférieur), celles en piscine au B2.'),
    S('Physiothérapie cardio-respiratoire', ['B11'], '3e étage', ['physio respiratoire'], 'ACCES_B11_Centre_PhysioCardioRespi.pdf'),
    S('Gastroentérologie, Centre Crohn et Colite', ['B11'], '4e étage', ['crohn', 'colite', 'gastro'], 'ACCES_B11_Service_Gastroenterologie-Centre-Crohn-colite.pdf'),
    S('Nutrition', ['B11'], '3e étage', ['dieteticienne', 'regime', 'nutritionniste'], 'ACCES_B11_Service_Nutrition.pdf'),
    S('Endocrinologie, diabétologie, obésité', ['B11'], '3e étage', ['diabete', 'thyroide', 'obesite', 'endocrinologue'], 'ACCES_B11_Service_Endocrinologie_Diab_Obe.pdf'),
    S('Urologie', ['B11', 'B12'], 'B11 4e étage · B12 rez-de-chaussée', ['urologue', 'prostate', 'vessie', 'rein'], 'ACCES_B11_Service_Urologie.pdf',
      note='Deux lieux de consultation : vérifiez votre convocation.'),
    S('Médecine du travail', ['B11'], '4e étage', [], 'ACCES_B11_Service_MedecineTravail.pdf'),
    S('Services administratifs', ['B11'], '1er étage', ['facturation', 'administration'], 'ACCES_B11_Service_Administratifs.pdf'),
    S('Gynécologie, endométriose, fertilité', ['B11'], '2e étage', ['fertilite', 'endometriose', 'pma', 'fiv', 'wenger'], 'ACCES_B11_Centre_GynecologieFertilite.pdf'),
    S('Clinique de la douleur', ['B11'], '2e étage', ['douleur', 'antalgie'], 'ACCES_B11_Centre_Douleur.pdf'),
    S('Dermatologie', ['B11'], None, ['peau', 'dermatologue'], url='dermatologie'),
    S('Cours de préparation à la naissance', ['B11'], '4e étage', ['preparation naissance', 'grossesse'], url='cours-de-preparation-la-naissance'),
    S('Cardio-Tour, DIAfit (réadaptation)', ['B11'], None, ['readaptation', 'diafit', 'cardio-tour']),
    # --- B12
    S('Cardiologie', ['B12'], '1er étage', ['coeur', 'cardiologue'], '31-0319_LA-TOUR_UNITE-cardiologie.pdf', url='cardiologie'),
    S('Gynécologie', ['B12'], 'Rez-de-chaussée', ['gynecologue', 'gyneco'], '31-0319_LA-TOUR_UNITE-gyneco.pdf'),
    S('Médecine maternelle', ['B12'], 'Rez-de-chaussée', ['grossesse'], '31-0319_LA-TOUR_UNITE-Med-maternelle.pdf'),
    S('Médecine préventive', ['B12'], '1er étage', ['check-up', 'bilan'], '31-0319_LA-TOUR_UNITE-Med-preventive.pdf'),
    S('ORL', ['B12'], '1er étage', ['oto-rhino-laryngologie', 'oreille', 'nez', 'gorge'], '31-0319_LA-TOUR_UNITE-ORL.pdf', url='centre-orl'),
    S('Neurologie', ['B12'], None, ['neurologue', 'migraine', 'epilepsie', 'eeg'], url='centre-de-neurologie'),
    # --- JDM
    S('Ostéopathie', ['JDM9'], None, ['osteo', 'osteopathe'], url='osteopathie'),
    S('Nutrition du sport', ['JDM9'], None, [], url='nutrition-du-sport'),
    S('Psychologie du sport', ['JDM9'], None, [], url='psychologie-du-sport'),
    S('Médecine générale', ['JDM1'], 'Rez-de-chaussée gauche (n° 1 bis)', ['generaliste', 'medecin de famille'], url='medecine-generale'),
    S('Tabacologie', ['JDM1'], 'Rez-de-chaussée gauche (n° 1 bis)', ['tabac', 'arreter de fumer'], url='consultation-de-tabacologie'),
    S('Centre laser dermatologique', ['JDM1'], 'N° 1 bis', ['laser', 'laserdermato'], url='centre-laser-dermatologique'),
]

NUM2B = {'11': 'JDM11', '9': 'JDM9', '1': 'JDM1', '1b': 'JDM1', '1bis': 'JDM1'}
doctors, unknown = [], 0
for d in docs:
    b = []
    for x in d['blds']:
        x = x.upper()
        b.append('JDM1' if x.startswith('JDM1') and not x.startswith('JDM11') else x)
    if not b:
        for n in d['nums']:
            k = re.sub(r'\s', '', n).lower()
            if k in NUM2B: b.append(NUM2B[k])
    b = [x for x in dict.fromkeys(b) if x in ('B1', 'B2', 'B11', 'B12', 'JDM1', 'JDM9', 'JDM11')]
    e = {'type': 'medecin', 'nom': f"{d['status'] or 'Dr'} {re.sub(r'\s+', ' ', d['name']).strip()}",
         'service': d['spec'], 'batiments': b, 'url': 'https://www.la-tour.ch' + d['href']}
    if not b:
        unknown += 1
        e['note'] = 'Bâtiment non indiqué sur le site : adressez-vous à l’accueil du B1.'
    doctors.append(e)
doctors.sort(key=lambda e: e['nom'].split(' ', 1)[1])

with open(out, 'w') as f:
    f.write("""// Annuaire : services et médecins -> bâtiment de destination.
// Généré à partir de la-tour.ch (page Accès, pages des services, plans d'accès PDF, fiches médecins)
// et des règles données par l'hôpital. Modifiable à la main.
//
//   nom       : ce que le patient voit
//   batiments : codes B1, B2, B11, B12, JDM1, JDM9, JDM11, URG, URG_PED (le premier = destination par défaut)
//   etage     : optionnel, affiché tel quel
//   motsCles  : synonymes ; la recherche ignore accents et majuscules
//   plan      : optionnel, lien vers le plan d'accès PDF du service
//   note      : optionnel, message affiché au patient
""")
    f.write('window.ANNUAIRE = ' + json.dumps(services + doctors, ensure_ascii=False, indent=0).replace('\n', '') .replace('},{', '},\n{') + ';\n')
print(len(services), 'services,', len(doctors), 'médecins,', unknown, 'sans bâtiment')
