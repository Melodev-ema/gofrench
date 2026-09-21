# GoFrench — Générateur de quiz par LLM

Test technique GoFrench (mission développement IA).

## Objectif

Exposer un endpoint `POST /quiz` qui génère des questions à choix multiples sur un sujet donné,
avec un niveau de difficulté paramétrable, via un LLM distant (OpenAI).
La réponse est strictement conforme au schéma Zod imposé par l'énoncé.

## Stack

- Node.js 22 et TypeScript en mode strict
- Express
- Zod pour la validation des entrées et des sorties
- SDK OpenAI
- Vitest pour les tests
- ESLint et Prettier

## Installation

```bash
npm install
```

## Configuration

Copier le fichier d'exemple, puis renseigner la clé API OpenAI :

```bash
cp .env.example .env
```

| Variable         | Obligatoire | Description                        |
| ---------------- | ----------- | ---------------------------------- |
| `OPENAI_API_KEY` | oui         | Clé API OpenAI                     |
| `PORT`           | non         | Port HTTP (par défaut : `3000`)    |

Le fichier `.env` est ignoré par Git. Aucune clé n'est versionnée.

## Lancement

```bash
npm run dev
```

En production :

```bash
npm run build && npm start
```

## Endpoint

### `POST /quiz`

Corps de la requête (`Content-Type: application/json`) :

| Champ              | Type                                   | Contrainte          |
| ------------------ | -------------------------------------- | ------------------- |
| `sujet`            | `string`                               | non vide            |
| `niveau`           | `"facile"` \| `"moyen"` \| `"difficile"` |                     |
| `nombre_questions` | `number`                               | entier de 1 à 10    |

Réponses :

| Statut | Cas                                                        |
| ------ | ---------------------------------------------------------- |
| `200`  | Quiz conforme au schéma imposé                             |
| `400`  | Entrée invalide (`INVALID_INPUT`)                          |
| `502`  | Aucune sortie valide du LLM après 3 tentatives (`QUIZ_GENERATION_FAILED`) |
| `500`  | Erreur interne (`INTERNAL_ERROR`)                          |

### Exemple de requête

```bash
curl -X POST http://localhost:3000/quiz \
  -H "Content-Type: application/json" \
  -d '{"sujet": "géographie mondiale", "niveau": "moyen", "nombre_questions": 5}'
```

### Exemple de réponse (`200`)

```json
{
  "sujet": "géographie mondiale",
  "niveau": "moyen",
  "questions": [
    {
      "question": "Quelle est la capitale de l'Australie ?",
      "options": ["Sydney", "Melbourne", "Canberra", "Perth"],
      "bonne_reponse": 2,
      "explication": "Canberra a été choisie comme capitale pour départager Sydney et Melbourne."
    }
  ]
}
```

### Exemple d'erreur (`502`)

```json
{
  "error": {
    "code": "QUIZ_GENERATION_FAILED",
    "message": "Unable to generate a valid quiz after 3 attempts."
  }
}
```

## Tests

```bash
npm test
```

Les tests n'appellent jamais le vrai LLM : le provider est mocké.

- **Cas nominal** : le provider renvoie une réponse valide et le test vérifie qu'elle respecte `ReponseSchema`.
- **Retry** : le premier appel renvoie une réponse malformée, le second une réponse valide.
  Le test vérifie que le LLM a été appelé exactement 2 fois.

Vérifications qualité :

```bash
npm run lint
npm run typecheck
npm test
```

## Architecture

```text
src/
├── app.ts                  # application Express (sans listen), testable
├── server.ts               # configuration et démarrage
├── quiz/
│   ├── quiz.controller.ts  # couche HTTP : validation de l'entrée, appel du service
│   ├── quiz.service.ts     # orchestration : prompt, appel LLM, parsing, validation, retry
│   ├── quiz.schema.ts      # schémas Zod (entrée et schéma imposé)
│   └── quiz.prompt.ts      # construction du prompt selon la tentative
├── llm/
│   ├── llm.provider.ts     # interface LlmProvider
│   └── openai.provider.ts  # implémentation OpenAI
└── middleware/
    └── error-handler.ts    # format d'erreur uniforme

tests/
├── quiz.service.test.ts
└── quiz.endpoint.test.ts
```

Flux de génération :

```text
Requête → validation de l'entrée → prompt → appel LLM → JSON.parse() → ReponseSchema.safeParse()
                                     ↑                                           │
                                     └──── prompt ajusté (max 3 tentatives) ─────┘ invalide
```

## Choix techniques

- **Zod comme unique source de vérité.** Les contrats d'entrée et de sortie sont des schémas Zod,
  et les types TypeScript en sont dérivés avec `z.infer`. Aucune interface ne duplique un schéma.
- **La sortie du LLM n'est jamais fiable.** Elle est systématiquement parsée puis validée avant d'être renvoyée.
  JSON malformé, champs manquants, mauvais types, nombre d'options différent de 4 ou `bonne_reponse`
  hors limites : toute violation déclenche une nouvelle tentative.
- **Retry ciblé.** Au maximum 3 tentatives. À partir de la deuxième, le prompt insiste sur le respect
  strict du format. Le retry ne concerne que la sortie non conforme, conformément à l'énoncé.
- **Abstraction `LlmProvider` minimale.** Une seule méthode, `generate(prompt)`. Elle découple le service
  du SDK et permet de mocker le LLM dans les tests. Un seul provider réel est implémenté.
- **Séparation des responsabilités.** Le controller gère le HTTP, le service gère la génération.
  Le controller ne contient aucune logique de génération.
- **Sécurité proportionnée au scope.**
  - Validation de toutes les entrées.
  - `sujet` traité comme une donnée non fiable et délimité dans le prompt.
  - Taille du body limitée.
  - Clé API lue depuis l'environnement.
  - Aucune stack trace, clé ni détail interne exposé dans les réponses ou les logs.
- **KISS / YAGNI.** Aucune fonctionnalité hors consignes. L'évolutivité repose sur la structure du code.

## Évolutions possibles

Pistes volontairement non implémentées, hors du scope du test :

- Structured Outputs d'OpenAI pour contraindre le format à la source
- Retry réseau avec backoff exponentiel
- Rate limiting
- Timeout et circuit breaker sur l'appel LLM
- Cache des quiz générés
- Support de plusieurs providers
- Monitoring, observabilité, métriques de consommation et de coût
