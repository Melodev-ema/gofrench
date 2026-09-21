# GoFrench — Générateur de quiz par LLM

Test technique GoFrench (mission développement IA).

Une API qui génère des questions à choix multiples sur un sujet donné, à un niveau de difficulté donné,
grâce à un LLM (OpenAI ou Gemini). La sortie du LLM n'est jamais considérée comme fiable : elle est validée
par un schéma Zod et regénérée avec un prompt renforcé tant qu'elle n'est pas conforme, dans la limite de
3 tentatives.

## Démarrage rapide

Prérequis : **Docker** avec **Docker Compose 2.24 ou plus récent**, et **Make**. Node.js n'est pas nécessaire.

```bash
git clone https://github.com/Melodev-ema/gofrench.git
cd gofrench
make env        # crée .env à partir de .env.example
```

Renseigner une clé API dans `.env` (voir [Clé API](#clé-api)), puis :

```bash
make up         # construit et lance l'API
make demo       # génère un quiz d'exemple (appelle le LLM)
make down       # arrête l'API
```

La documentation interactive est disponible sur http://localhost:3000/docs : choisir `POST /quiz`,
**Try it out**, puis **Execute**.

Si le port 3000 est déjà utilisé : `PORT=3100 make up`, puis `make demo PORT=3100`.

## Commandes

Toutes les commandes s'exécutent dans Docker. `make` seul affiche la liste.

| Commande | Rôle |
| --- | --- |
| `make env` | Crée `.env` à partir de `.env.example` (ne l'écrase jamais) |
| `make up` / `make down` | Lance / arrête l'API en arrière-plan |
| `make logs` | Affiche les logs de l'API |
| `make dev` | Lance l'API en mode développement, rechargée à chaque modification |
| `make demo` | Envoie une requête d'exemple à `POST /quiz` (**consomme du crédit ou du quota**) |
| `make check` | Lint, typage, format et tests |
| `make test` | Tests seuls |
| `make lint` / `make typecheck` / `make format` | Chaque vérification séparément |

Sans Docker, avec Node.js ≥ 22.13 : `npm ci`, puis `npm run dev`, `npm test` ou `npm run check`.

## Clé API

Chaque utilisateur fournit sa propre clé, dans `.env` ou `.env.local` (qui surcharge `.env`).
Ces deux fichiers sont ignorés par Git et ne sont jamais copiés dans l'image Docker.

| | Gemini (par défaut dans `.env.example`) | OpenAI |
| --- | --- | --- |
| Créer la clé | https://aistudio.google.com/apikey | https://platform.openai.com/api-keys |
| Coût | offre gratuite (modèles Flash, quotas limités) | crédits prépayés |
| Variables | `LLM_PROVIDER=gemini`, `GEMINI_API_KEY` | `LLM_PROVIDER=openai`, `OPENAI_API_KEY` |
| Modèle par défaut | `gemini-flash-latest` (`GEMINI_MODEL`) | `gpt-5.4-mini` (`OPENAI_MODEL`) |

Pour OpenAI, une clé aux droits restreints suffit : **Model capabilities → Responses** en écriture, tout le reste à
`None`. Une clé Gemini créée dans AI Studio est déjà limitée à l'API Gemini.

Sans clé, le serveur refuse de démarrer et indique la variable manquante.

## Tests

```bash
make check
```

49 tests, sans aucun appel réel à un LLM : le LLM est simulé (`vi.fn()`) et les SDK reçoivent un faux transport
réseau. Ils couvrent :

- **le cas nominal** : la réponse respecte le schéma ;
- **le retry** : une sortie malformée suivie d'une sortie valide donne 2 appels au LLM, avec un prompt renforcé ;
- **chaque sortie invalide** : JSON malformé, Markdown autour du JSON, champ manquant, mauvais type, 3 options,
  index hors limites ;
- **l'échec** : après 3 sorties invalides, une erreur 502 explicite ;
- **l'API** : chaque code d'erreur, et l'absence de fuite de clé dans les réponses et les logs ;
- **la configuration, les providers et la documentation OpenAPI**.

Chaque test a été vérifié en cassant volontairement le code correspondant : il doit alors échouer.

## API

### `POST /quiz`

```bash
curl -X POST http://localhost:3000/quiz \
  -H "Content-Type: application/json" \
  -d '{"subject": "géographie mondiale", "level": "medium", "question_count": 2, "language": "fr"}'
```

| Champ | Type | Contraintes |
| --- | --- | --- |
| `subject` | string | non vide (espaces retirés) |
| `level` | `"easy"` \| `"medium"` \| `"hard"` | |
| `question_count` | integer | de 1 à 10 |
| `language` | string, optionnel | code ISO 639-1 (`fr`, `en`, `es`…), `fr` par défaut |

Réponse `200` (sortie réelle) :

```json
{
  "subject": "géographie mondiale",
  "level": "medium",
  "questions": [
    {
      "question": "Quelle est la capitale de l'Australie ?",
      "options": ["Sydney", "Melbourne", "Canberra", "Brisbane"],
      "correct_answer": 2,
      "explanation": "Canberra est la capitale fédérale de l'Australie, choisie comme compromis entre Sydney et Melbourne."
    }
  ]
}
```

`correct_answer` est l'index, à partir de 0, de la bonne option dans `options`.

### Erreurs

Format unique : `{ "error": { "code": "...", "message": "...", "details": [...] } }` (`details` pour les erreurs
de saisie uniquement).

| Statut | Code | Cas |
| --- | --- | --- |
| 400 | `INVALID_INPUT` | Requête non conforme, avec le détail de chaque champ |
| 400 | `INVALID_JSON` | JSON malformé |
| 413 | `PAYLOAD_TOO_LARGE` | Corps de plus de 10 ko |
| 502 | `QUIZ_GENERATION_FAILED` | Aucune sortie valide du LLM après 3 tentatives |
| 502 | `LLM_PROVIDER_ERROR` | Le provider a échoué (clé invalide, quota, surcharge, panne) |
| 500 | `INTERNAL_ERROR` | Erreur inattendue (message générique, aucun détail interne) |

### Documentation

- `GET /docs` : Swagger UI (chargé depuis un CDN : le navigateur doit avoir accès à Internet).
- `GET /openapi.json` : document OpenAPI 3.1, importable dans Postman, Insomnia ou Bruno.

## Correspondance avec l'énoncé

Le contrat est traduit en anglais, champ par champ, avec la même structure et les mêmes contraintes :

| Énoncé | Projet |
| --- | --- |
| `sujet`, `niveau`, `nombre_questions` | `subject`, `level`, `question_count` |
| `facile`, `moyen`, `difficile` | `easy`, `medium`, `hard` |
| `ReponseSchema` | `QuizResponseSchema` |
| `bonne_reponse`, `explication` | `correct_answer`, `explanation` |
| (absent) | `language` : langue du contenu, `fr` par défaut |

**Pourquoi** : une seule langue dans tout le projet (code, API, prompt, messages d'erreur), ce qui est la norme
pour une API. Le **contenu** des quiz, lui, reste en français par défaut : c'est ce que lit l'apprenant.
Conséquence assumée : une requête utilisant les noms de l'énoncé est refusée (400), avec la liste des champs attendus.

## Architecture

```text
src/
├── server.ts              seul point d'assemblage : config → provider → service → app → écoute
├── app.ts                 application Express (sans écoute, testable)
├── config.ts              variables d'environnement validées par Zod
├── quiz/
│   ├── quiz.schema.ts     contrats Zod : entrée et réponse
│   ├── quiz.language.ts   codes de langue ISO 639-1
│   ├── quiz.prompt.ts     construction du prompt, renforcé à partir de la 2ᵉ tentative
│   ├── quiz.service.ts    appel au LLM, validation, retry
│   └── quiz.controller.ts couche HTTP : validation de l'entrée, appel du service
├── llm/
│   ├── llm.provider.ts    interface LlmProvider et erreur LlmProviderError
│   ├── llm.factory.ts     choix du provider selon LLM_PROVIDER
│   ├── openai.provider.ts
│   └── gemini.provider.ts
├── middleware/
│   └── error-handler.ts   format d'erreur unique
└── docs/                  OpenAPI généré depuis Zod, Swagger UI
```

Flux d'une requête :

```text
POST /quiz → validation Zod de l'entrée → prompt → LLM → JSON.parse → validation Zod de la sortie
                                            ↑                                    │ invalide
                                            └──── prompt renforcé (3 tentatives max) ───┘
```

## Choix techniques

- **Zod, source de vérité unique** : les types TypeScript sont dérivés des schémas (`z.infer`), et la documentation
  OpenAPI est générée à partir d'eux. Aucune définition dupliquée.
- **La sortie du LLM n'est jamais fiable** : `JSON.parse` puis `safeParse`. Le mode JSON des providers garantit la
  syntaxe, pas la structure : la validation reste indispensable.
- **Retry ciblé** : il porte uniquement sur une sortie non conforme, avec au maximum 3 tentatives et un prompt
  renforcé à partir de la 2ᵉ. Les erreurs des providers (clé, quota, panne) ne sont pas retentées, et les retries
  automatiques des SDK sont désactivés : la durée d'une requête reste prévisible.
- **Providers derrière une interface** (`LlmProvider`) : le service ne connaît aucun SDK. Ajouter un provider demande
  une classe, une valeur de configuration et un cas dans la factory. Chaque provider traduit les erreurs de son SDK
  en `LlmProviderError`, qui ne conserve que le statut HTTP.
- **Prompt en anglais, contenu dans la langue demandée** : les modèles suivent plus précisément les consignes de
  format en anglais, avec moins de tokens. La langue du contenu tient en une seule consigne.
- **Sujet traité comme une donnée non fiable** : il est placé entre balises dédiées, sans les caractères `<` et `>`,
  avec la consigne d'ignorer toute instruction qu'il contiendrait. Même détourné, le modèle ne peut renvoyer
  qu'un quiz conforme au schéma.
- **Sécurité proportionnée** : toutes les entrées sont validées, y compris l'environnement ; le corps est limité à
  10 ko ; l'en-tête `X-Powered-By` est retiré ; aucune stack trace ni message interne n'est renvoyé ; les erreurs
  inattendues sont journalisées sans leur message ; l'image Docker ne contient que les dépendances de production et
  tourne avec un utilisateur non-root.
- **502 pour les échecs amont** : une sortie inexploitable ou un provider en panne n'est pas une erreur de notre
  serveur.
- **Docker et Make comme seule procédure** : un Dockerfile multi-étapes (outils, compilation, image livrée),
  Compose pour l'API et les outils, et des commandes auto-documentées.
- **Qualité** : TypeScript strict, ESLint `strictTypeChecked` (aucun `any`), Prettier, code sans commentaires
  (des noms explicites à la place) et commits atomiques.

## Limites connues

- Le schéma de réponse, fidèle à l'énoncé, accepte un `correct_answer` non entier (`1.5`).
- Le nombre de questions renvoyées n'est pas comparé au nombre demandé.
- La langue et la justesse du contenu ne sont pas vérifiables par un schéma : une question discutable reste
  structurellement valide.
- Les modèles placent souvent la bonne réponse aux mêmes positions, en particulier la première.
- Les modèles évoluent vite : un modèle peut être retiré (404) ou surchargé (503). `GEMINI_MODEL` et `OPENAI_MODEL`
  permettent d'en changer sans toucher au code.

## Et après ?

Ce service génère un quiz. Pour une école de langue, c'est la première brique d'un outil pédagogique, et plusieurs
directions sont possibles.

**Du quiz à l'apprentissage**
- Récupérer les réponses des apprenants, les corriger avec les explications déjà générées et calculer un score.
- Remplacer `easy` / `medium` / `hard` par les niveaux du CECRL (A1 à C2), qui parlent aux apprenants et aux
  enseignants.
- Adapter la difficulté au fil des réponses, et revenir sur les notions ratées grâce à la répétition espacée.

**Persistance et réutilisation**
- Enregistrer les quiz générés pour constituer une banque de questions relue, réutilisable et moins coûteuse
  qu'une génération systématique.
- Mettre en cache les demandes identiques, et éviter les doublons d'une génération à l'autre.

**Sécurité de la soumission du sujet**
- Authentifier les appels et appliquer un rate limiting par utilisateur, pour maîtriser les coûts.
- Modérer le sujet avant génération (contenus inappropriés, tentatives d'injection de prompt).

**Fiabilité et qualité**
- Utiliser les Structured Outputs : le schéma est alors imposé côté API et les retries deviennent rares.
- Retenter les erreurs temporaires (429, 503) avec un backoff exponentiel, et ajouter un timeout ainsi qu'un second
  provider de secours.
- Vérifier la justesse des questions par un second modèle ou par une relecture humaine, et mélanger les options
  côté serveur pour neutraliser le biais de position.
- Contrôler le nombre de questions et la langue du contenu.

**Exploitation**
- Mettre en place des logs structurés et des métriques (latence, taux de retry, coût par quiz, provider utilisé),
  ainsi qu'une CI qui lance `make check` sur chaque merge request.

Ce sont autant de sujets à explorer ensemble : le socle actuel (contrats Zod, providers interchangeables, tests
sans LLM) a été pensé pour les accueillir sans tout réécrire.
