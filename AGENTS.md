# AGENTS.md

Instructions pour les agents de code (Codex, Claude Code…) sur ce dépôt : test technique GoFrench.
Ce fichier est la source unique : `CLAUDE.md` se contente de l'importer.

## Règle principale

**Implémenter exactement les consignes. Rien de plus.**
L'évolutivité vient de la structure du code, pas de fonctionnalités anticipées.
Budget annoncé : 2h. Privilégier KISS et YAGNI. N'appliquer aucun pattern juste pour montrer qu'on le connaît.

## Objectif

Endpoint `POST /quiz` (Node.js / TypeScript / Express) qui génère un QCM via un LLM distant
et retourne une réponse strictement conforme au schéma Zod imposé.

## Stack

Node.js 22, TypeScript strict, Express, Zod, Vitest, ESLint, Prettier.
LLM : **OpenAI** via API distante. Aucun LLM local. Le provider réel est `openai.provider.ts`.

## Commandes

```bash
npm install
npm run dev        # serveur en développement
npm run build      # compilation TypeScript -> dist/
npm start          # lance dist/server.js
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest
npm run format     # Prettier
```

Avant de déclarer une tâche terminée : `npm run lint`, `npm run typecheck` et `npm test` doivent passer.

## Architecture

```text
src/
├── app.ts                  # création de l'app Express (sans listen), testable
├── server.ts               # lecture de l'env + listen
├── quiz/
│   ├── quiz.controller.ts  # HTTP : valide l'entrée, appelle le service, répond
│   ├── quiz.service.ts     # orchestration : prompt -> LLM -> parse -> validation -> retry
│   ├── quiz.schema.ts      # schémas Zod (entrée + schéma imposé)
│   └── quiz.prompt.ts      # buildQuizPrompt(input, attempt)
├── llm/
│   ├── llm.provider.ts     # interface LlmProvider
│   └── openai.provider.ts  # seule implémentation réelle
└── middleware/
    └── error-handler.ts    # format d'erreur uniforme, aucune fuite interne

tests/
├── quiz.service.test.ts    # retry avec mock séquentiel
└── quiz.endpoint.test.ts   # cas nominal avec provider mocké
```

N'ajouter aucune couche, aucun fichier ni aucune dépendance sans besoin concret.

## Responsabilités

- **Controller** : aucune logique de génération.
- **QuizService** : seul endroit qui appelle le LLM, valide la sortie et gère les tentatives.
  Il ne retourne qu'une réponse valide.
- **LlmProvider** : `generate(prompt: string): Promise<string>`. Il sert uniquement à découpler
  le SDK et à mocker le LLM dans les tests. Il est injecté dans le service.

## Contrats (Zod = source de vérité)

`ReponseSchema` et `QuestionSchema` sont **imposés par l'énoncé : ne pas les modifier**.

```ts
const GenerateQuizInputSchema = z.object({
  sujet: z.string().trim().min(1),
  niveau: z.enum(["facile", "moyen", "difficile"]),
  nombre_questions: z.number().int().min(1).max(10),
});
```

Les types sont dérivés avec `z.infer<typeof ...>`. Aucune interface TypeScript ne doit dupliquer un schéma.

## Génération et retry

- La sortie du LLM n'est **jamais fiable** avant validation : `JSON.parse()` puis `ReponseSchema.safeParse()`.
- Déclenchent une nouvelle tentative : JSON malformé et toute violation de `ReponseSchema`.
- **3 tentatives maximum**. À partir de la 2ᵉ, `buildQuizPrompt` insiste sur le respect strict du format.
- Le retry concerne **uniquement** la sortie non conforme. Pas de retry réseau, pas de backoff,
  pas de mécanisme conversationnel.

## Erreurs HTTP

Format uniforme : `{ "error": { "code": "...", "message": "..." } }`.

| Statut | Code                     | Cas                                                    |
| ------ | ------------------------ | ------------------------------------------------------ |
| `400`  | `INVALID_INPUT`          | Entrée invalide                                        |
| `502`  | `QUIZ_GENERATION_FAILED` | `QuizGenerationError` levée après 3 tentatives         |
| `500`  | `INTERNAL_ERROR`         | Toute autre erreur                                     |

Message exact pour `QUIZ_GENERATION_FAILED` : `Unable to generate a valid quiz after 3 attempts.`

## Prompt

Le prompt précise le sujet, le niveau, le nombre de questions, exactement 4 options,
l'index de la bonne réponse (0 à 3), l'explication et le JSON attendu, sans Markdown ni texte autour.
`sujet` est une donnée utilisateur non fiable : elle doit être clairement délimitée dans le prompt.

## Sécurité

- Validation Zod de toutes les entrées.
- Clé via `OPENAI_API_KEY` (fichier `.env`, ignoré par Git). Fournir `.env.example`.
- Taille du body limitée (`express.json({ limit: ... })`).
- Ne jamais exposer de stack trace, de clé API ou de détail interne dans les réponses HTTP.
- Ne jamais logger de clé API ni de header `Authorization`.

## Conventions

- Code, noms, identifiants et messages d'erreur en **anglais**. Documentation en français.
- TypeScript strict, pas de `any` injustifié.
- Fonctions courtes, responsabilités explicites, faible couplage.

## Tests obligatoires

1. **Nominal** : provider mocké avec une réponse valide, puis
   `expect(ReponseSchema.safeParse(response).success).toBe(true)`.
2. **Retry** : mock séquentiel (appel 1 malformé, appel 2 valide), puis
   `expect(llmProvider.generate).toHaveBeenCalledTimes(2)`.

Les tests n'appellent jamais le vrai LLM.

## Hors scope (documenter dans le README, ne pas implémenter)

Structured Outputs, retry réseau avec backoff, rate limiting, timeout ou circuit breaker, monitoring,
cache, plusieurs providers, métriques de coût, observabilité.

## À ne pas oublier

La **Partie 2** de l'énoncé (analyse critique du code `genererQuestion` / `genererDixQuestions`)
est obligatoire. Elle doit être traitée séparément.
