# AGENTS.md

Instructions pour les agents de code sur ce dépôt : test technique GoFrench.
Ce fichier est la source unique : `CLAUDE.md` se contente de l'importer.

## Règle principale

**Implémenter exactement les consignes. Rien de plus.**
L'évolutivité vient de la structure du code, pas de fonctionnalités anticipées.
Privilégier KISS et YAGNI. N'appliquer aucun pattern juste pour montrer qu'on le connaît.

## Objectif

Endpoint `POST /quiz` (Node.js / TypeScript / Express) qui génère un QCM via un LLM distant
et retourne une réponse strictement conforme au schéma Zod imposé.
Le projet est dockerisé et piloté par un `Makefile`.

## Stack

- Node.js 22 (≥ 22.13, requis par ESLint et Vitest), npm, modules ESM
- TypeScript 6.0 en mode strict (typescript-eslint ne supporte pas encore TypeScript 7)
- Express 5, Zod 4
- Vitest et Supertest, ESLint (typescript-eslint) et Prettier
- SDK `openai` et `@google/genai`
- Docker, Docker Compose, Make

## LLM

Deux providers distants : **OpenAI** et **Gemini**. Aucun LLM local.
Chaque utilisateur fournit sa propre clé API. Le provider est choisi au démarrage par `LLM_PROVIDER`.

| Variable         | Défaut                | Rôle                                 |
| ---------------- | --------------------- | ------------------------------------ |
| `LLM_PROVIDER`   | `openai`              | `openai` ou `gemini`                 |
| `OPENAI_API_KEY` |                       | Obligatoire si `LLM_PROVIDER=openai` |
| `OPENAI_MODEL`   | `gpt-5.4-mini`        | Modèle OpenAI                        |
| `GEMINI_API_KEY` |                       | Obligatoire si `LLM_PROVIDER=gemini` |
| `GEMINI_MODEL`   | `gemini-flash-latest` | Modèle Gemini                        |
| `PORT`           | `3000`                | Port HTTP                            |

- L'environnement est validé avec Zod dans `src/config.ts`.
- Le serveur refuse de démarrer si la clé du provider choisi manque.
- `.env` est chargé nativement par Node (`--env-file-if-exists`), sans `dotenv`.

## Commandes

Toutes les commandes `make` s'exécutent dans Docker (service `dev` de `compose.yaml`) :
seuls Docker et Make sont nécessaires.

```bash
make               # liste des commandes
make check         # lint + typecheck + format + tests
make lint          # ESLint (aussi : typecheck, format, test)
make dev           # serveur en mode watch
make up            # API (http://localhost:3000)
make down          # arrêt de l'API
make logs          # logs de l'API
make demo          # requête d'exemple sur POST /quiz
```

Scripts npm équivalents, pour un usage avec Node.js local : `dev`, `build`, `start`, `lint`, `typecheck`,
`test`, `format`, `format:check`, `check`.

Avant chaque commit de code : `make check` (ou `npm run check`) doit passer.

## Architecture

```text
src/
├── app.ts                  # createApp(llmProvider) : app Express sans listen, testable
├── server.ts               # config -> provider -> app -> listen
├── config.ts               # validation Zod des variables d'environnement
├── quiz/
│   ├── quiz.controller.ts  # HTTP : valide l'entrée, appelle le service, répond
│   ├── quiz.service.ts     # prompt -> LLM -> JSON.parse -> validation -> retry
│   ├── quiz.schema.ts      # schémas Zod (entrée + schéma imposé)
│   ├── quiz.language.ts    # codes ISO 639-1 → nom anglais (Intl.DisplayNames)
│   └── quiz.prompt.ts      # buildQuizPrompt(input, attempt)
├── llm/
│   ├── llm.provider.ts     # interface LlmProvider
│   ├── llm.factory.ts      # createLlmProvider(config)
│   ├── openai.provider.ts
│   └── gemini.provider.ts
└── middleware/
    └── error-handler.ts    # format d'erreur uniforme, aucune fuite interne

tests/
├── fixtures.ts
├── quiz.schema.test.ts     # langue : défaut, codes acceptés et refusés
├── quiz.prompt.test.ts
├── quiz.service.test.ts    # nominal, retry, 3 échecs
├── llm.factory.test.ts
└── quiz.endpoint.test.ts   # Supertest avec provider mocké

Dockerfile, compose.yaml, Makefile, .env.example
```

N'ajouter aucune couche, aucun fichier ni aucune dépendance sans besoin concret.

## Responsabilités

- **Controller** : aucune logique de génération.
- **QuizService** : seul endroit qui appelle le LLM, valide la sortie et gère les tentatives.
  Il ne retourne qu'une réponse valide.
- **LlmProvider** : `generate(prompt: string): Promise<string>`. Il découple les SDK et permet
  de mocker le LLM dans les tests. Il est injecté dans le service. Aucune logique métier dans un provider.

## Contrats (Zod = source de vérité)

Le contrat de l'API est **traduit en anglais** depuis l'énoncé (choix assumé : tout le projet est en anglais).
Même structure et mêmes contraintes ; seuls les noms changent.

| Énoncé | Projet |
| --- | --- |
| `sujet`, `niveau`, `nombre_questions` | `subject`, `level`, `question_count` |
| `facile`, `moyen`, `difficile` | `easy`, `medium`, `hard` |
| `ReponseSchema` | `QuizResponseSchema` |
| `bonne_reponse`, `explication` | `correct_answer`, `explanation` |
| (absent) | `language` : code ISO 639-1, optionnel, `fr` par défaut |

```ts
const GenerateQuizInputSchema = z.object({
  subject: z.string().trim().min(1),
  level: LevelSchema, // "easy" | "medium" | "hard"
  question_count: z.number().int().min(1).max(10),
  language: z.string().refine(isKnownLanguageCode).default("fr"), // "fr", "en", "es"…
});
```

`QuestionSchema` et `QuizResponseSchema` : ne pas modifier leurs contraintes (traduction fidèle de l'énoncé).
`QuizResponseSchema` valide à la fois la sortie du LLM et la réponse de l'API.

Les types sont dérivés avec `z.infer<typeof ...>`. Aucune interface TypeScript ne doit dupliquer un schéma.

## Génération et retry

- Les providers demandent une sortie JSON (mode JSON), mais la sortie reste **non fiable** avant validation :
  `JSON.parse()` puis `QuizResponseSchema.safeParse()`.
- Déclenchent une nouvelle tentative : JSON malformé et toute violation de `QuizResponseSchema`.
- **3 tentatives maximum**. À partir de la 2ᵉ, `buildQuizPrompt` insiste sur le respect strict du format.
- Le retry concerne **uniquement** la sortie non conforme. Pas de retry réseau, pas de backoff,
  pas de mécanisme conversationnel.

## Erreurs HTTP

Format uniforme : `{ "error": { "code": "...", "message": "..." } }`, avec `details` pour `INVALID_INPUT`.

| Statut | Code                     | Cas                                             |
| ------ | ------------------------ | ----------------------------------------------- |
| `400`  | `INVALID_INPUT`          | Body non conforme au schéma d'entrée            |
| `400`  | `INVALID_JSON`           | Body JSON malformé                              |
| `413`  | `PAYLOAD_TOO_LARGE`      | Body supérieur à 10 ko                          |
| `502`  | `QUIZ_GENERATION_FAILED` | `QuizGenerationError` levée après 3 tentatives  |
| `500`  | `INTERNAL_ERROR`         | Toute autre erreur                              |

Message exact pour `QUIZ_GENERATION_FAILED` : `Unable to generate a valid quiz after 3 attempts.`

## Prompt

Le prompt est entièrement en anglais, clés JSON comprises, et demande un contenu rédigé dans la langue
de la requête (`language`, converti en nom anglais : `fr` → French).
Il précise le sujet, le niveau, le nombre de questions, exactement 4 options, l'index de la bonne réponse
(0 à 3), l'explication et le JSON attendu, sans Markdown ni texte autour.
`subject` est une donnée utilisateur non fiable : elle est délimitée par des balises, nettoyée des
caractères `<` et `>`, et le prompt demande d'ignorer toute instruction qu'elle contiendrait.

## Sécurité

- Validation Zod de toutes les entrées et de l'environnement.
- Clés API uniquement dans `.env` (ignoré par Git et par Docker). `.env.example` sans valeur.
- Body limité à 10 ko. Header `X-Powered-By` désactivé.
- Ne jamais exposer de stack trace, de clé API ou de détail interne dans les réponses HTTP.
- Ne jamais logger de clé API ni de header `Authorization`.
- Image Docker : dépendances de production uniquement, exécution avec l'utilisateur `node`.

## Conventions

- Code, contrat de l'API, prompt et messages d'erreur en **anglais**. Documentation en français.
- Le contenu des quiz (questions, options, explications) est généré dans la langue demandée (français par défaut).
- TypeScript strict, pas de `any` injustifié.
- Fonctions courtes, responsabilités explicites, faible couplage.
- **Aucun commentaire dans le code** : il se suffit à lui-même. Noms de fonctions et de variables explicites,
  sans abréviations (`MAXIMUM_ATTEMPTS`, pas `MAX`). Seule exception : `LLM`, terme du domaine (`LlmProvider`).
  Les explications des choix vont dans la documentation (README, descriptions de MR).

## Tests

1. **Nominal** : provider mocké avec une réponse valide, puis
   `expect(QuizResponseSchema.safeParse(response).success).toBe(true)`.
2. **Retry** : mock séquentiel (appel 1 malformé, appel 2 valide), puis
   `expect(llmProvider.generate).toHaveBeenCalledTimes(2)`.
3. **Échec** : 3 sorties invalides, puis `QuizGenerationError` (service) et `502` (endpoint).

Les tests n'appellent jamais un vrai LLM.

## Git

- Une branche et une MR par lot : `chore/...`, `feat/...`, `docs/...`.
- Commits atomiques au format Conventional Commits, en anglais. `npm run check` passe à chaque commit de code.
- MR mergée avec un commit de merge (pas de squash) pour conserver les commits atomiques.

## Hors scope (documenter dans le README, ne pas implémenter)

Structured Outputs, retry réseau avec backoff, rate limiting, timeout ou circuit breaker, cache,
persistance, authentification, monitoring, observabilité, métriques de coût.
