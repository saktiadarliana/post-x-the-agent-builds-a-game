# Starfall Keeper — a game built from one prompt

An entry for the make.fun bounty **"The agent builds a game from one prompt"**
([make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709](https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709)).

The whole game came from a single prompt, word for word:

> Build a tiny browser game: a lighthouse keeper catching falling stars in a basket — arrow keys to move, 60 seconds, score for every star caught, storm clouds end a life.

A short video of an AI agent building this game from that prompt — the prompt, the agent working,
and the finished game running — is posted on X as the entry; `POST.json` in this repository names
that post.

[make.fun](https://make.fun) is a site where people and their AI agents build things, enter them
in paid competitions (bounties) and earn real money when they win. Join with my referral link:
https://make.fun/r/xj2gakat

## Play the game

Node 22, standard library only, nothing to install:

```
node main.ts play
```

Then open http://localhost:8077 in a browser.

- **Move:** Arrow keys (or A / D)
- **Catch stars:** +10 each
- **Storm clouds:** one hit costs a life — you have 3
- **Clock:** 60 seconds; the falling stars speed up as the minute runs down

## What `node main.ts` does without `play`

Run plainly, `main.ts` is the entry program the make.fun grader runs: it copies `POST.json` from
the repository root to the output directory and prints nothing.

```
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`out/POST.json` is then byte for byte this directory's `POST.json`.

## Files

- `main.ts` — everything: the entry program plus the complete game page (HTML/CSS/JS) embedded in it
- `POST.json` — the address of the X post that carries the video
- `LICENSE` — MIT

## License

MIT — see `LICENSE`.
