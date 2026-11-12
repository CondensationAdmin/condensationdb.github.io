# Régénérer les données

- `campus-geo.js` : bâtiments, parkings, chemins piétons et trajet navette, depuis OpenStreetMap.
  1. `curl "https://api.openstreetmap.org/api/0.6/map?bbox=6.0590,46.2245,6.0730,46.2335" -o campus.osm`
  2. `python3 extraire_osm.py campus.osm ../campus-geo.js`
- `annuaire.js` : services et médecins vers bâtiment. Généré depuis la-tour.ch (page Accès, pages des services,
  plans d'accès PDF, fiches médecins) par `generer_annuaire.py`. On peut aussi le modifier directement à la main.

Liens à envoyer aux patients (convocation, SMS) :
- `index.html?to=B12` ouvre l'itinéraire vers le B12
- `index.html?service=ORL` ouvre l'itinéraire vers le service, avec l'étage
- `index.html?q=physio` ouvre la recherche déjà remplie
