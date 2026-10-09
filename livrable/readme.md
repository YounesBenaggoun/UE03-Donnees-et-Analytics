# Rattrapage UE 03 – Données et Analytics

lien du dépot gitHub https://github.com/YounesBenaggoun/UE03-Donnees-et-Analytics

## Présentation du projet

Ce projet est réalisé dans le cadre du rattrapage de l'UE 03 – Données et Analytics.

Ce README explique les étapes nécessaires pour construire l'image Docker et démarrer les services de l'application à l'aide de Docker Compose.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé les outils suivants :

* [Docker Desktop](https://www.docker.com/products/docker-desktop/) sous Windows, macOS ou Linux.
* Docker Compose, inclus dans les versions récentes de Docker Desktop.
* Git, si vous souhaitez récupérer le projet depuis un dépôt distant.

## Installation et démarrage

### Étape 1 — Construire l'image Docker

Ouvrez un terminal à la racine du projet, dans le dossier contenant le `Dockerfile`.

Exécutez la commande suivante :

```bash
docker build -t myapp .
```

**Explication :**

* `docker build` : construit une image Docker à partir du Dockerfile.
* `-t myapp` : attribue le nom `myapp` à l'image créée.
* `.` : indique que le contexte de construction est le dossier courant.

Vérifiez que l'image a été créée :

```bash
docker images
```

### Étape 2 — Démarrer les services avec Docker Compose

À la racine du projet, dans le dossier contenant le fichier `compose.yaml` ou `docker-compose.yml`, exécutez :

```bash
docker compose up -d
```

**Explication :**

* `docker compose up` : crée et démarre les services définis dans le fichier Compose.
* `-d` : lance les conteneurs en arrière-plan.

Docker Compose démarre les services configurés dans le fichier de composition, par exemple l'application, la base de données ou les outils d'analytics, selon la configuration du projet.

## Vérification du fonctionnement

### Vérifier les conteneurs

```bash
docker compose ps
```

Cette commande affiche les conteneurs, leur état et les ports éventuellement exposés.

### Consulter les logs

```bash
docker compose logs -f
```

Cette commande permet de suivre les journaux des services en temps réel.

Pour consulter les logs d'un service spécifique :

```bash
docker compose logs -f nom_du_service
```

Remplacez `nom_du_service` par le nom réel du service défini dans le fichier Compose.

## Arrêter le projet

Pour arrêter les conteneurs sans supprimer les données persistantes :

```bash
docker compose down
```

Pour redémarrer ensuite les services :

```bash
docker compose up -d
```

## Résolution des problèmes

* **Docker ne démarre pas :** vérifiez que Docker Desktop est lancé et que le moteur Docker fonctionne.
* **Le build échoue :** vérifiez la présence du `Dockerfile` et des fichiers nécessaires à la construction.
* **Un service ne démarre pas :** consultez les logs avec `docker compose logs -f`.
* **Un port est déjà utilisé :** vérifiez les ports configurés dans le fichier Compose et libérez le port concerné si nécessaire.

## Commandes récapitulatives

```bash
# 1. Construire l'image Docker
docker build -t myapp .

# 2. Démarrer les services
docker compose up -d

# 3. Vérifier les conteneurs
docker compose ps

# 4. Consulter les logs
docker compose logs -f

# 5. Arrêter les services
docker compose down
```

## Auteur

Projet réalisé dans le cadre du rattrapage **UE 03 – Données et Analytics**.
