# Watermark Studio — v0.4.2 locale

Application de bureau Electron + React. Une ou plusieurs photos **JPEG** et un watermark **PNG réellement transparent**. Ollama analyse chaque photo et le watermark ; le moteur Sharp applique ensuite les coordonnées validées sans génération d’image.

## Installation et releases

Les installateurs sont disponibles dans les [releases GitHub](https://github.com/vlebourl/watermark-studio/releases) : Windows x64 (`.exe` NSIS), Linux x64 (`.AppImage` et `.deb`), macOS Intel et Apple Silicon (`.dmg` distincts). Les binaires ne sont pas signés ni notarisés pour le moment. Ollama et le modèle vision doivent être installés séparément sur la machine ; ils ne sont pas intégrés aux installateurs.

La pipeline **Tests** vérifie chaque push sur `main` et chaque pull request sur Windows, Linux et macOS. **Executables de release** construit et teste les quatre variantes sur leurs runners natifs. Une fois tous les builds réussis, elle joint les fichiers et `SHA256SUMS.txt` à la release. Les tests automatisés ne nécessitent pas Ollama ; les parcours IA restent des tests locaux.

Pour publier une version, mettre à jour `version` dans `package.json` et `package-lock.json`, pousser le commit, puis créer et publier une release GitHub avec le tag correspondant, par exemple `v0.4.1`. Le tag doit pointer sur ce commit. Une release publiée déclenche la pipeline ; un lancement manuel depuis Actions construit des artifacts sans les publier dans une release. Pour relancer après un échec, utiliser **Re-run failed jobs** dans Actions.

Développement avec Node.js 22 : `npm ci`, `npm test`, `npm start`. Installer localement les formats de distribution avec `npm run dist` sur le système cible (ou `npm run dist -- --win --x64`, `--linux --x64`, `--mac --arm64`). `npm run pack` garde le mode dossier destiné aux essais locaux.

Dans **La signature**, le bouton **Inverser les couleurs** transforme notamment une signature blanche en noire, sans modifier sa transparence, sa taille ou son placement. **Rétablir les couleurs** revient au PNG d’origine. Le choix est sauvegardé et utilisé dans l’aperçu, par Ollama et à l’export, pour tout le lot. Les suggestions et validations précédentes sont réinitialisées puisque le contraste change ; les fichiers source restent intacts.

## Nouveautés v0.4 : sélection commune et critique étayée

La sélection JPEG, le lot et la photo active sont désormais communs aux deux modules. Importer dans Watermark ou Critique, puis changer d’onglet sans réimporter. Chaque photo conserve séparément son placement de watermark et sa critique. Dans Critique, **Évaluer les photos restantes** traite séquentiellement le lot ; les erreurs sont isolées et l’arrêt conserve les résultats déjà obtenus. Les anciennes critiques sont signalées et peuvent être réévaluées avec la nouvelle grille.

La grille critique demande pour **chaque critère** des observations précises, les défauts visibles et les incertitudes. Une première évaluation est relue dans une seconde requête visuelle par le **même modèle**, pour corriger les affirmations inventées, les louanges non étayées et les notes incohérentes. Une bonne note doit être justifiée par les éléments visibles ; les notes ne sont pas abaissées artificiellement. Une réponse incomplète est refusée et le résultat précédent reste disponible.

Pour compléter le jugement d’exposition, l’application mesure un histogramme et les fractions de pixels très clairs, presque blancs et sombres, globalement et par neuf régions. Mesure en sRGB sur une version décodée de 1600 pixels maximum. Ces valeurs sont transmises au modèle et affichées : elles ne prouvent pas, seules, une surexposition et n’imposent aucune pénalité automatique. Un fond blanc, la neige ou des reflets peuvent être légitimes.

La relecture du même modèle n’est pas une validation indépendante et ne garantit pas l’absence d’erreur. Les détails « Observations, défauts et incertitudes » permettent de vérifier les arguments photo par photo. Originalité et esthétique restent subjectives. Le coût en temps est supérieur à une seule passe.

Tests : `scripts/shared-selection-smoke.cjs` vérifie l’import d’un dossier dans Critique et le maintien de la photo active dans Watermark puis Critique. `scripts/critical-regression.cjs` compare une scène synthétique de référence à des variantes volontairement surexposée et floue, avec le même modèle et la même grille. Ce test vérifie la baisse des notes techniques, pas une calibration générale sur des photographies réelles.

## Nouveautés v0.3 : Critique photo

L’onglet **Critique photo** évalue une photo JPEG indépendamment du watermark. Ouvrir une photo ou utiliser l’original actuellement sélectionné dans Watermark. Le serveur Ollama et le modèle sont partagés entre les deux modules ; aucune nouvelle installation de modèle n’est requise.

Les six critères sont **cadrage, exposition, mise au point, originalité, composition et évaluation subjective**. Chaque note est un nombre de 0 à 10, validé avant affichage, avec une justification liée aux éléments visibles. Le modèle fournit aussi une synthèse, des pistes d’amélioration et les limites de son analyse.

La note globale est une moyenne pondérée calculée par l’application : `Σ(note × poids) / Σ(poids)`. Poids égaux par défaut, réglables de 0 à 10. Un poids nul exclut un critère. Si tous les poids sont nuls, aucune note globale n’est affichée. Les modifications de poids ne font aucun appel au modèle et ne modifient pas les notes individuelles.

L’analyse utilise une vue complète de 1600 pixels maximum et un détail central de 900 × 900 pixels maximum à résolution native. Le détail peut ne pas contenir le sujet ; la qualité de mise au point ne constitue donc pas une mesure exhaustive de la netteté du fichier. L’originalité et l’évaluation subjective sont des appréciations du modèle. L’image originale reste intacte.

Résultat, modèle utilisé, date et pondérations sont sauvegardés avec la session. **Exporter le rapport** produit un JSON avec les six notes, leurs justifications, la synthèse, les limites, les poids et la moyenne non arrondie. Choisir une autre photo remet la critique à zéro ; une nouvelle évaluation remplace la précédente après validation de la réponse. En cas d’erreur ou d’annulation, le résultat précédent reste disponible.

Vérifications v0.3 : huit tests automatisés réussis ; parcours réel sur une scène synthétique avec `qwen3-vl:30b-a3b-instruct`, puis modification des poids, export et restauration. Rapports de test : `test-output/review-ui-report.json` et `test-output/review-restore.json`. Le script Electron `scripts/review-smoke.cjs` réalise ce parcours ; `--restore-check` vérifie la session restaurée.

## Nouveautés v0.2 : lots et justifications

- Import de plusieurs fichiers JPEG ou d’un dossier, avec sous-dossiers facultatifs. Maximum 100 photos ; fichiers invalides signalés, doublons de chemins ignorés.
- Sélection photo par photo dans la liste du lot. Statuts à analyser, à valider, validée, exportée ou erreur. Les aperçus pleine taille ne sont chargés que pour la photo consultée.
- Le modèle fournit pour chaque photo une justification distincte de **la position** et de **la taille**. L’interface affiche la région, les coordonnées, la largeur en pourcentage et les dimensions exactes du watermark en pixels. Ces valeurs sont calculées par le moteur, indépendamment du texte explicatif.
- Une correction manuelle conserve la justification initiale avec un avertissement explicite. Une copie de réglages au lot est identifiée comme manuelle, sans prétendre qu’elle provient d’une analyse des photos cibles.
- **Analyser les photos restantes** appelle Ollama une photo après l’autre. Validation individuelle par défaut ; option de validation automatique avant lancement. Les erreurs sont isolées et peuvent être reprises en relançant l’analyse des photos restantes.
- **Exporter les photos validées** conserve les noms et l’arborescence relative. Les collisions créent des noms uniques sans toucher aux originaux, même si le dossier choisi contient les fichiers sources. Les erreurs d’export sont reprises lors du prochain export.
- Arrêt du traitement : annule la requête Ollama en cours ; pour l’export, termine la photo en cours. Les photos restantes sont conservées. La session sauvegarde le lot, les réglages, les statuts et les justifications.
- Un changement de watermark remet les photos à analyser et invalide leurs validations.

Parcours du lot : importer les JPEG → choisir le PNG → analyser → consulter les justifications et ajuster → valider → exporter. Le parcours d’une seule photo reste disponible.

Identité visuelle **Atelier** : charbon chaud, ivoire et ambre, avec une icône de signature photographique générée et intégrée à la fenêtre et à l’exécutable. [Direction artistique](assets/ART-DIRECTION.md), [prompt de génération](assets/brand-prompt.txt). Les ressources PNG et ICO se trouvent dans `assets/`. Pour reconstruire les tailles de l’icône : `node scripts/icons.cjs`.

## Utilisation sous Windows

Double-cliquer sur `Lancer-Watermark.cmd`. Dans le projet de développement, il utilise le runtime Electron installé et les fichiers compilés. Sans ce runtime, il lance `release/win-unpacked/Watermark Studio.exe`. Aucun Node.js n’est nécessaire pour le paquet autonome ; conserver tout le dossier `win-unpacked` ensemble. La politique de contrôle des applications de Windows peut bloquer l’exécutable autonome non signé : cela a été observé après reconstruction de la v0.2. Le runtime de développement a alors été utilisé, sans modification des protections Windows. Une signature de distribution sera nécessaire avant une livraison installable fiable sur ces machines.

Depuis les sources déjà installées : clic droit sur `Start-MVP.ps1`, puis **Exécuter avec PowerShell**. Avec Node.js et npm standards :

```sh
npm ci
npm start
```

Ollama doit être lancé sur cette machine. Modèle conseillé pour le MVP et la RTX 5090 : **qwen3-vl:8b-instruct**, quantifié Q4_K_M, disponible dans la bibliothèque officielle : https://ollama.com/library/qwen3-vl:8b-instruct

```sh
ollama pull qwen3-vl:8b-instruct
```

Le modèle est téléchargé sur la machine de développement. L’application utilise par défaut `http://localhost:11434`. Le bouton ↻ vérifie la connexion et liste les modèles installés ; le champ permet de choisir un autre modèle vision. Préférer une variante Instruct aux variantes Thinking pour des réponses JSON rapides.

1. Choisir une photo JPEG, puis un watermark PNG avec transparence.
2. Choisir le mode discret, équilibré ou protection.
3. Cliquer sur **Proposer un placement**.
4. Vérifier l’aperçu. Déplacer la signature à la souris ou ajuster les valeurs numériques. Pour une nouvelle proposition, saisir une consigne puis **Demander un ajustement**.
5. **Exporter la photo** et choisir un dossier. Un nouveau fichier `nom_watermarked.jpg` est créé. Si nécessaire, un suffixe numérique est ajouté, sans écrasement.

La session est sauvegardée automatiquement dans le répertoire utilisateur Electron. Elle contient les chemins des deux images et les réglages ; les sources doivent rester accessibles. Aucune clé API n’est nécessaire et les images restent sur la machine. Le PoC refuse les endpoints distants.

## Traitement et limites

- Photo envoyée au modèle sous forme d’aperçu de 1280 px maximum, sans agrandissement. Watermark de 640 px maximum présenté sur fond gris pour l’analyse uniquement. Le rendu conserve sa transparence d’origine.
- Réponse Ollama contrainte par un schéma JSON, puis validation indépendante des nombres et des limites de la photo. Une suggestion invalide est refusée ; le placement précédent reste disponible.
- `x` et `y` représentent le coin supérieur gauche normalisé par les dimensions de la photo. `width` est la fraction de la largeur de la photo. Hauteur déduite du ratio original ; positions et dimensions arrondies en pixels une seule fois.
- Composition déterministe à la résolution complète. Le LLM ne modifie jamais les pixels et n’est pas appelé à l’export.
- Orientation EXIF appliquée aux pixels, puis mise à 1 dans l’export. Dimensions visuelles et ratio conservés, y compris pour les JPEG de portrait avec rotation EXIF.
- Profil ICC et métadonnées conservés via Sharp. L’orientation et les champs associés au nouveau fichier peuvent évoluer. Ce MVP n’a pas été vérifié avec tous les profils ICC ni toutes les métadonnées propriétaires.
- JPEG réencodé à qualité 100, sous-échantillonnage 4:4:4. **Une identité des pixels hors watermark dans le JPEG exporté n’est pas garantie** à cause du réencodage avec perte. Le moteur conserve ces pixels avant compression pour les JPEG sRGB testés.
- L’aperçu interactif utilise les images réduites et la composition du navigateur ; le moteur d’export effectue la composition à la résolution native.
- Maximum 100 millions de pixels par image, 100 photos par lot. Les formats TIFF, PNG photo, WebP, BMP, RAW, watermark texte/SVG, variantes et presets ne sont pas encore pris en charge.
- Interface et logique portables Windows/macOS/Linux ; seul le paquet Windows a été exécuté et vérifié ici. Construire les paquets macOS/Linux sur leurs plateformes respectives.

## Développement et vérifications

```sh
npm run build
npm test
node scripts/integration.cjs
npx electron scripts/smoke.cjs
npm run pack
```

`tests/engine.test.cjs` vérifie la géométrie, le ratio, le rejet des placements invalides, l’alpha, la reproductibilité, les pixels hors zone avant compression JPEG, les dimensions, les métadonnées EXIF, l’orientation et l’absence d’écrasement.

`scripts/integration.cjs` crée une scène de test synthétique et une signature PNG, appelle réellement Ollama pour une proposition puis une correction, et exporte le résultat dans `test-output/`.

`scripts/smoke.cjs` lance l’application Electron avec une session de test isolée et vérifie le flux interface → IPC → Ollama → export. Les dialogues de fichiers sont remplacés uniquement dans ce script de test. Une capture est enregistrée dans `test-output/ui.png`.

`tests/batch.test.cjs` vérifie l’import récursif, les limites, la déduplication, les chemins de sortie, les erreurs isolées, leur reprise, la validation, l’export sans écrasement et l’annulation. `scripts/batch-smoke.cjs` vérifie le parcours réel d’un dossier de deux photos, l’analyse Ollama, les justifications distinctes et l’export. L’option `--restore-check` vérifie la restauration de la session et de ses explications. Rapports : `test-output/batch-ui-report.json` et `test-output/batch-restore-report.json`.

Les dialogues de fichiers, la lecture des sources, les appels Ollama et l’export vivent dans le processus principal. Le renderer est isolé, sans accès Node, sans navigation externe et sans accès réseau direct. Aucune bibliothèque ni police n’est chargée depuis un CDN.

Vérifications effectuées sur Windows avec la RTX 5090 : les trois tests du moteur passent ; une vraie proposition Ollama suivie d’une correction par commentaire fonctionne sur une scène synthétique ; le flux complet dans l’interface et l’export depuis l’exécutable empaqueté passent. Première proposition en environ 3,8 secondes lors du test d’intégration, correction en environ 0,4 seconde ; ces temps varient selon les images et l’état du modèle. `test-output/package-report.json` contient le résultat de la vérification du paquet.

Références : [API Chat Ollama](https://docs.ollama.com/api/chat), [sorties structurées](https://docs.ollama.com/capabilities/structured-outputs), [sorties Sharp](https://sharp.pixelplumbing.com/api-output/).
