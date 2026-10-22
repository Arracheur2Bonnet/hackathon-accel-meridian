# Hack Builder

### Problème

Une entreprise de ventes de produits frais (par exemple Kumo) veut optimiser la transmission d’info et trouver une source de vérité unique pour les opérateurs. Impossible trop de donnés dispersé partout, les opérations sont complexes pour rien, énorme complexité solution, unifier avec data on top. Contexte sémantique.

### User

Les opérateurs Kumo qui gèrent les opérations : flux tendus, stocks, production, livraisons, qualité.

### Why the user adopts

- Moins de temps perdu à chercher et recouper l’information.
- Décisions plus rapides, basées sur toutes les sources.
- Moins d’invendus, de ruptures et de risques sanitaires.
- Aucune migration : la couche se branche sur les outils existants.

### Solution

Une couche de données unifiée avec un contexte sémantique, et des agents qui pilotent les opérations à partir de cette couche.

### Detail solution

- **Unifier :** connecter l’ERP, les tableurs et les autres logiciels dans un modèle commun. (pas le centre de la demo)
- **Contexte :** relier les données par un modèle métier (Lot, Recette, Livraison, Point de vente, Température, Allergène). Comment ? 20 à 50 questions générées par les opérateurs, qui servent à créer le parfait contexte sémantique pour la donnée et le contexte agent.
- **Agents :**
    1. Traçabilité et rappel de lot?
    2. Plan de production du lendemain.
    3. Alerte chaîne du froid.
- **Démo (3 min) :** Trouver quoi faire
- **Périmètre 6 h :** 2 à 3 sources (données synthétiques si besoin), 1 agent complet, 1 agent léger, une interface simple.

# Cahier des charges — Site de démonstration du hackathon

Le site doit servir à enregistrer une vidéo de 3 minutes présentant un scénario unique : une grosse commande client arrive, l'IA détecte que l'entreprise risque de ne pas pouvoir la satisfaire, croise ses données et propose un plan d'action. À la fin, on révèle comment la couche de données sémantique rend cette analyse possible.

Texte collé.txt

## 1. Le scénario de la vidéo, minute par minute

[Inventory Management Software System | HashMicro](https://images.openai.com/static-rsc-4/LcFn-B5yDUZ0DYPnwAcCjBwvFriXXiNdr4t_h05vXIRg1raR2OcwpkzhzDN6589rlM4v5qMzSu8HgC1zJ7lvHRsKmEDTiW0JOveGHpogwjDRw8I3ThwFJY5WU_XZ8LmU2oZRK8Qo4MJMQXgx5Fkl3DqiaAPh9RtxkQGAdpEZ32M?purpose=inline)

### 00:00–00:15 — Le problème

L'entreprise reçoit des commandes, consulte ses stocks dans des fichiers, ses plannings dans un autre outil et ses informations fournisseurs dans des e-mails.

Le spectateur comprend immédiatement que les informations sont dispersées et qu'une décision opérationnelle nécessite de les recouper.

### 00:15–00:35 — Une grosse commande arrive

Un client distributeur, illustré par Monoprix dans votre scénario fictif, envoie une commande importante de produits au saumon pour le lendemain.

L'agent détecte la commande entrante et lance son analyse. Il ne s'agit pas simplement d'un utilisateur qui pose une question à un chatbot : l'événement déclenche le workflow.

[Supply Chain Dashboard – Orders, Inventory & Logistics UI by Fokhrul Islam Suhan for Creliq UX/UI Design Agency on Dribbble](https://images.openai.com/static-rsc-4/Vuaorr8IIjEXub8xQpjk1prPD41KXsPYsAzyd0W5Y7bjcLw_yaCa_K-kLMYlwXn70AsPg5-HYZiU9V8neX8tsJzBCIkXRsTzGAPAs8i9XOuItLY1fclBwXxrADnMpGnLOsRoozXk_mmPNDxDOD9YSlcbCV0Lnz6EiCoM8ve0lpY?purpose=inline)

### 00:35–01:10 — L'agent enquête

L'agent croise les informations de la commande avec les stocks disponibles, les réservations déjà engagées, les délais fournisseurs et la capacité de production de la cuisine.

Il identifie le problème, montre les données utilisées et explique pourquoi la commande présente un risque.

[Quantos — Closed-Loop Intelligence for Enterprise Decision Control](https://images.openai.com/static-rsc-4/h56wllEWkkshwc6A90XPUvLNvXlAvaT4taEDPv7LD9TbGMcZvRV9LEymTBKbNGfvZ6b8nlkIdtC1tLZb9Gndm-RAHTY_eIzRxIdl7yhEBVQOq7Ih6egXjyBQPat8xobuTHEpT9cM7Nvzgm3fCUVocL0ckYJb8uqhB9laDs3PpYM?purpose=inline)

### 01:10–01:40 — Le plan d'action

L'agent présente ses recommandations : approvisionnement complémentaire, ajustement du planning de production et mobilisation éventuelle de ressources supplémentaires.

Chaque proposition est justifiée par une donnée. L'utilisateur voit les actions, leurs priorités et les contraintes identifiées.

[Multi-Project Management with AI | Allex.ai](https://images.openai.com/static-rsc-4/kyVr23frhA7iRT8t4Q5VXGGqrfHNRY_cBefXbzKmnua6cYuz2elEMR1Re-OYsz3CBvuji8JTOf_oBgfMdybJJe6OsapEI8K7ksYxK1zQrL9B0FmZ-ps2LvOI7PUhZiPRwRF1-b5UGVqirulOsA78tzcfswz2tZpEmFT99hzS_2g?purpose=inline)

### 01:40–02:00 — L'opérateur valide

L'utilisateur examine le plan et clique sur « Approve plan ».

Les actions passent au statut approuvé dans la démonstration. Une référence de commande ou de dossier, par exemple `OPS-2482`, est conservée pour la suite.

[Best Supply Chain Management (SCM) Software of 2026](https://images.openai.com/static-rsc-4/XtlmtFB_pUbC2bmTBq1NW4KK_mb7LxoqhnDL6lyc0PPdAzxSj-xQpYXt7R3NRzX4oy5hwobPYMGjRWCWK3rshQPQs5QwQKK54YYUbD9mta7pRu8opBIhxuxVx7tG5PED9ZguBc7zZFt5kM_P4rBGxLGF67clWQ_gH5TrQmSMfP0?purpose=inline)

### 02:00–02:25 — Le chatbot et l'analyse

L'utilisateur ouvre le chatbot et demande, par exemple : « Show me the stock coverage and production impact for order OPS-2482 ».

Le site affiche une visualisation des stocks, du déficit et du plan de production, à partir du même jeu de données.

[Cerebro Dynamics — Software & Technology](https://images.openai.com/static-rsc-4/UVoJl9YFOJ6TcQn9n4FX-7U7abEi1gLMiEyQNBZ5ydjhj2sc_prAx_NTAD1IJFgSNyJIyUBiLuvPE03tgPsjfw3kOJGLxGKqUyEtjESeScL07M-miAjPwFD4tYM9iBAz8Ay2vi3C9q2NMduTZQEJR6h1warvC6j6d7CbFsx0id4?purpose=inline)

### 02:25–03:00 — Les coulisses technologiques

On remonte à la source : les données importées, leur structuration, les questions métier et l'ontologie créée.

On montre comment les stocks, les produits, les commandes, les fournisseurs et les capacités de production deviennent des entités reliées. L'agent peut ensuite exploiter ce contexte commun.

## 2. Les écrans que le site doit contenir

Il n'est pas nécessaire de créer six pages indépendantes. Vous pouvez réaliser une application avec une barre latérale et quelques écrans principaux, reliés par des interactions déterministes.

Écran 1 — Operations Overview

Dashboard d'accueil contenant la commande entrante, une alerte opérationnelle, les stocks, la capacité de production et l'activité des agents. C'est le point de départ de la vidéo.

Écran 2 — Agent Investigation

Détail de la commande et analyse de l'agent : données consultées, résultats, problèmes détectés et plan d'action. C'est l'écran le plus important du site.

Écran 3 — Action Plan

Liste des actions proposées avec leur raison, priorité, statut et bouton de validation. La validation doit modifier l'état de l'interface.

Écran 4 — AI Analytics

Chatbot prérempli avec une question sur `OPS-2482`, puis affichage d'un graphique de couverture des stocks et d'une synthèse de production.

Écran 5 — Data Foundation

Écran révélant les fichiers sources, les tables structurées, le questionnaire métier et le graphe de l'ontologie. Il sert à expliquer la technologie durant les 30 à 35 dernières secondes.

## 3. Les données nécessaires à la démonstration

Pour que la vidéo soit crédible, toutes les données doivent être cohérentes. Voici un jeu de données illustratif, à ajuster selon les éléments réellement présents dans votre projet.

| Élément | Valeur de démonstration |
| --- | --- |
| Client | Monoprix — scénario fictif |
| Commande | `ORD-2482` |
| Produit | Portions de saumon |
| Quantité commandée | 500 portions |
| Stock physique | 420 portions |
| Stock réservé à d'autres commandes | 160 portions |
| Stock réellement disponible | 260 portions |
| Quantité manquante | 240 portions |
| Capacité journalière de production | 600 portions |
| Production déjà planifiée | 410 portions |
| Capacité restante initiale | 190 portions |

Ces chiffres sont des exemples, pas des données réelles de Kumo.

Sur cette base, l'agent peut conclure que le stock disponible est insuffisant de 240 portions et que la production planifiée ne dispose que de 190 portions de capacité libre. Il peut alors proposer un approvisionnement complémentaire et un ajustement de capacité, sous réserve des délais fournisseurs et des contraintes réelles.

Le site doit afficher à chaque étape les données ayant justifié la conclusion.

## 4. Les interactions qui doivent fonctionner

Le parcours doit être enregistrable de bout en bout, sans intervention technique pendant la vidéo.

1. Cliquer sur la commande entrante.
2. Cliquer sur Investigate Order.
3. Voir les étapes de l'analyse apparaître progressivement : commande, stocks, approvisionnements, capacités.
4. Afficher les constats et recommandations cohérents avec les données.
5. Cliquer sur Approve Plan et voir les statuts se mettre à jour.
6. Ouvrir le chatbot avec la référence de commande.
7. Déclencher une visualisation des stocks et des besoins de production.
8. Ouvrir l'écran Data Foundation pour montrer la provenance et les relations entre les données.

Prévoyez un bouton de réinitialisation du scénario pour pouvoir recommencer la capture vidéo depuis le début.

## 5. Ce qu'il faut montrer sur l'ontologie à la fin

C'est un élément essentiel de votre différenciation technique.

L'écran final doit montrer le chemin suivant :

1. Sources de données

Fichiers CSV, stocks, commandes, fournisseurs, production

2. Structure et contexte métier

Schémas, entités, relations et réponses aux questions des opérateurs

3. Ontologie unifiée

Commande → Produit → Stock → Fournisseur → Production

4. Agents opérationnels

Analyse, recommandations, planification et visualisations

L'idée est de faire comprendre que l'agent ne devine pas comment fonctionne l'entreprise : il s'appuie sur des données reliées par un contexte métier explicite. Votre discussion évoque 20 à 50 questions posées aux opérateurs pour construire ce contexte.

Dans la démonstration, il faut donc idéalement pouvoir montrer l'import de fichiers, un aperçu de la structure des données, les questions métier et la visualisation des relations. Si vous ne disposez pas de ces fonctions dans le produit, créez une illustration locale de ce processus et distinguez-la des fonctions déjà implémentées.

## 6. Les contraintes à respecter pour ne pas décrédibiliser la démo

Le site peut utiliser des données synthétiques et simuler des étapes d'agent pour que la vidéo soit stable. Il faut cependant garder trois distinctions :

- Un agent qui recommande une action n'est pas un agent qui l'exécute. Sans intégration d'écriture, le bouton d'approbation doit afficher que le plan est validé dans la démonstration, pas qu'une commande fournisseur a réellement été envoyée.
- Des fichiers CSV ne sont pas des connexions ERP en direct. N'affichez pas un statut « Live » pour un connecteur simulé.
- Un workflow déterministe n'est pas nécessairement une exécution IA réelle. Si l'analyse est simulée, elle doit rester cohérente et ne pas être présentée comme une exécution réelle du modèle.

Enfin, pour la capture vidéo, concevez l'application pour une fenêtre de bureau en 1920 × 1080, avec des libellés assez grands, des transitions rapides et une navigation prévisible. Le scénario entier doit pouvoir être enregistré sans recharger le site ni attendre des traitements imprévisibles.

Le résultat recherché est un parcours simple : une commande arrive → l'agent identifie le problème → il construit un plan d'action → l'opérateur valide → le chatbot analyse les conséquences → vous révélez comment la sémantique des données rend tout cela possible.

Résumé

### Action Items

- [ ]  All teams: submit deliverables on the Builderbase platform by **3:30 PM**
- [ ]  Top 8 teams: prepare a 4–5 minute pitch for the ~4:00 PM finals round
- [ ]  Use Lovable QR codes in the room or the coupon code (emailed via Builderbase portal) to claim platform credits
- [ ]  Contact Sofia (sitting downstairs) or find an organizer if you have issues accessing credits or partner platforms

### Judging Criteria

Five criteria will be used to evaluate projects:  

- **Customer problem & product value** — Is this a real problem? Will customers actually pay for it? Be realistic about your target user's willingness to pay (e.g., students typically pay very little)
- **Agentic capability** — Are multiple agents used? Are they long-running and sophisticated? Agent-to-agent interaction is a plus
- **Interesting & innovative use of data** — Bulk data, web scraping, or streaming data all count; this is a **major** judging factor
    - Example: Scraping EU/French regulatory data to advise businesses on compliance
    - Example: London hackathon winner combined weather + shipping data for AI-based ship routing
- **Evidence it works** — No fully faked demos; at least a working slice of the product must be demonstrable
- **Execution & presentation** — Clear communication of what you built, why it's valuable, and why people would pay for it
- **Bonus: Use of partner products** — Using Aiven or Lovable in your build is not mandatory but is an additional positive judging factor

### Schedule & Timeline

- **Now → 3:30 PM** — Build time; judges (including the presenter) will circulate to mentor and evaluate
- **3:30 PM** — Deliverable submission deadline on Builderbase (updated from 3:00 PM)   — **do not miss this or you may be excluded from judging**
- **~4:00 PM** — Top 8 teams announced; each presents a 4–5 minute pitch
- **After pitches** — Second judging round to select top 3
- **Evening** — Drinks and networking

### Partner Spotlights

- **Aiven** (open-source data infrastructure, Helsinki-based with global offices)
    - Encourages use of their platform, including their **Runtime** service for deploying apps directly
    - Using Aiven is encouraged and factors positively into judging
- **Lovable** (Swedish product-building platform — "idea to company in seconds")
    - **100 QR codes** distributed in the room for credits
    - A **coupon code** will also be emailed via the Builderbase portal for an additional 100 users
    - Sofia from Lovable is available **downstairs** for credit issues, manual allocation, or feedback
- **Accel** — Co-presenting partner and Lovable investor

### General Notes

- If you're stuck or can't access platforms, **do not sit struggling** — find an organizer immediately
- The hackathon spans multiple floors and rooms; keep an eye out for organizers walking around

Notes

![6A7BE159-EE04-42B7-A20E-F237C6CADCFE.heic](6A7BE159-EE04-42B7-A20E-F237C6CADCFE.heic)

![3619F9EB-8FE1-493E-8DD0-72207A5264D2.heic](3619F9EB-8FE1-493E-8DD0-72207A5264D2.heic)