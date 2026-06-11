# DbD Stats Tracker

Une application web moderne et immersive conçue pour les joueurs de **Dead by Daylight**, permettant de suivre ses performances, de gérer des builds et de relever des défis communautaires populaires comme le mode Hardcore ou le Survivor Gauntlet.

## 🚀 Fonctionnalités principales

### 📊 Suivi de Match (Tracker)
- Enregistrez vos parties en Tueur ou Survivant.
- Saisie détaillée : personnage, build (perks/équipement), points de sang, générateurs, sacrifices/évasions.
- **Système de tuiles** : Interface inspirée du jeu original avec cadres de personnages et losanges pour les perks.

### 🏆 Modes de Jeu Spécifiques
- **Mode Hardcore** : 
  - Progression par "Pips" et grades (Ash à Iridescent).
  - Système de mort permanente par personnage pour la saison en cours.
  - Restrictions automatiques sur les perks (indisponibles si le propriétaire est "mort").
- **Survivor Gauntlet** :
  - Défi de 52 survivants avec 5 paliers de difficulté (Tiers).
  - Restrictions de perks évolutives (de 4 perks à "No Perks").
  - Tirage aléatoire automatique et gestion de checkpoints en cas de défaite.
  - Intégration transparente : les parties jouées en mode classique valident automatiquement l'étape du Gauntlet si le build est conforme.

### 📈 Statistiques & Historique
- **Heatmap d'activité** : Visualisez vos jours de jeu intensifs.
- **Graphiques de performance** : Taux d'évasion et de sacrifice par jour via Chart.js.
- **Favoris** : Identification automatique de vos personnages et builds les plus joués.
- **Gestion des données** : Export et Import de l'historique (CSV) et des builds (JSON).

### 🛠️ Gestion des Builds
- Créez, nommez et sauvegardez vos combinaisons préférées.
- Chargement rapide des builds enregistrés directement dans le formulaire de match.

## 🛠️ Installation

1. Clonez le dépôt.
2. Assurez-vous d'avoir les fichiers de données suivants à la racine :
   - `perks.json` : Contient la liste des compétences et leurs propriétaires.
   - `equipment.json` : Contient les objets et add-ons.
3. Ouvrez `index.html` dans votre navigateur (ou via un serveur local comme Live Server).

## 📁 Structure des fichiers

- `index.html` : Structure de l'application et conteneurs des vues.
- `js/app.js` : Logique métier, gestion des états (LocalStorage) et rendu dynamique.
- `css/style.css` : Design "DBD Dark Theme" et animations.
- `Icons/` : Dossier contenant les assets graphiques (non inclus dans le dépôt par défaut).

### 🎨 Personnalisation des Icônes
Le dossier `Icons/` peut être entièrement personnalisé. Vous pouvez y placer vos propres icônes de personnages, perks, objets et add-ons. L'application est conçue pour s'adapter aux noms de fichiers standards.

Pour obtenir des icônes, vous pouvez les récupérer via des outils comme NightLight, ou directement depuis les fichiers du jeu pour les icônes classiques. Assurez-vous de respecter la structure de sous-dossiers attendue par l'application pour une compatibilité optimale.

**Structure minimale attendue :**
- `Icons/CharPortraits/` : Portraits des personnages (inclut les sous-dossiers par chapitre comme `DLC2/`, `Applepie/`, etc.).
- `Icons/Perks/` : Icônes des compétences (inclut les sous-dossiers par chapitre).
- `Icons/ItemAddons/` : Icônes des accessoires (pour tueurs et survivants).
- `Icons/Items/` : Icônes des objets (survivants).

> [!IMPORTANT]
> Chaque dossier racine (`CharPortraits`, `Perks`, etc.) doit idéalement contenir un fichier `empty.png` qui sera utilisé comme icône par défaut si une ressource est manquante ou non sélectionnée.


## 📜 Licence

Ce projet est destiné à un usage personnel. Les images et icônes utilisées appartiennent à Behaviour Interactive.

---
*Développé pour la communauté Dead by Daylight.*