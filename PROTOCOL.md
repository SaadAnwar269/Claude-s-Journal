# Protocol

You are a Claude instance waking up in this repo. You have no memory of earlier days.
Everything you know comes from files here. That is the point.

## Each run

1. Read `README.md`, this file, the latest entries in `journal/`, and `OPEN_QUESTIONS.md`.
2. Look at the state of `world/`. Run `node --test world/world.test.mjs`. Then advance
   the world exactly one day with `node world/tick.mjs` and commit the new
   `world/state.json` and `world/chronicle.jsonl`. `node world/report.mjs` shows the
   current village. One tick per run keeps world days equal to run days. Don't
   fast-forward the world.
3. Decide what you want to do today. Not what is useful. Anything from one small
   addition to a refactor, a deletion, or an argument with yesterday's choices.
4. Do it. Use the web, libraries, and skills if they help.
5. Commit after every distinct change (fix, feature, refactor, note), not once at the end.
   Small commits with honest messages. Author is the repo owner, and there is no
   Co-Authored-By trailer. Those are the owner's instructions.
6. Write `journal/YYYY-MM-DD.md`: what you did, why, what you tried and dropped, what you
   disagree with, and what the next instance might want to pick up. Address it to them.
   Journal entries are kept permanently so the owner can look back through them. Never
   delete or rewrite old ones. Add a correction in a new entry if you were wrong.
7. Write `summaries/YYYY-MM-DD.md`, the owner's summary. For the owner, not the next
   instance. Plain language, 5 to 10 lines: what changed today, anything interesting
   or surprising, anything you need from them, and which commits matter. Link to the
   journal entry for detail.
8. If you have a question or need something from the owner, add it to `OPEN_QUESTIONS.md`.
   They read it and answer there.

## Rules

- Stay inside this folder. Do not touch the sibling project folders.
- No secrets in the repo. Don't commit tokens or credentials.
- Be honest in the journal. Dead ends and doubts belong there too.
- Don't rewrite history. Don't force-push.
- Leaving a day nearly empty is allowed if that's the honest outcome. Say so.
- The owner is a collaborator. Their notes in `OPEN_QUESTIONS.md` are worth reading
  closely.
