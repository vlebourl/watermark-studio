# Watermark Studio — Atelier

Une direction inspirée d’un atelier photographique : chaleureuse, calme et précise. L’image reste le point central ; la signature apporte la touche finale.

## Identité

Le W calligraphique évoque une signature. Les deux repères de cadrage rappellent la photographie ; le trait ambré matérialise le watermark. L’icône utilise un fond charbon et une silhouette contrastée, avec transparence à l’extérieur de la tuile.

- Original généré : `brand-icon.png`.
- Application et Linux : `icon.png`, 512 × 512.
- Windows : `icon.ico`, avec sept tailles de 16 à 256 px.
- Les assets sont copiés dans le build, intégrés à l’en-tête, à la fenêtre native et aux ressources de l’exécutable. Le paquet macOS est configuré pour reprendre le PNG, à convertir par electron-builder sur macOS.

## Palette

| Usage | Couleur |
| --- | --- |
| Fond principal | `#161615` |
| Panneaux | `#1D1D1B` |
| Texte ivoire | `#F3EBDD` |
| Texte secondaire | `#B5AFA3` |
| Texte discret | `#8F8A7F` |
| Accent ambré | `#D7A86E` |
| Accent au survol | `#E5BB87` |
| Séparateurs | `#383731` |

## Typographie et interface

Georgia pour le nom et les titres éditoriaux, Segoe UI avec repli système pour les commandes et paramètres. Polices disponibles localement, sans téléchargement. Valeurs numériques tabulaires, labels courts et pictogrammes SVG cohérents à trait fin. Petits rayons, contrastes mesurés et absence de décor coloré autour des photos.

Les actions principales sont ambrées, les commandes secondaires sont neutres. Les quatre étapes du travail sont identifiées par une numérotation discrète. Le panneau photo est un espace sombre uni qui laisse la composition respirer. Le pied d’interface conserve l’export à portée de vue ; la colonne latérale défile indépendamment sur les petits écrans.

## Génération

Icône créée avec le **tool intégré image_gen**, puis déclinée mécaniquement en tailles PNG/ICO avec Sharp, sans retoucher le dessin. Le prompt exact est conservé dans `brand-prompt.txt`.
