# Flashcards

A Claude-built no-install flashcard app for studying any subject. It runs entirely in the browser — no server, no build step.

## Run it

Open [`index.html`](index.html) in any modern browser. That's it.

If you'd rather serve it locally:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Loading a deck

Each line in your deck is one card with two sides separated by a delimiter. The parser auto-detects the delimiter per line:

| Format | Example |
| --- | --- |
| Pipe | `What is the capital of France? \| Paris` |
| Tab | `H2O<TAB>Water` |
| Comma (CSV) | `Chemical symbol for gold,Au` |

Rules:

- One card per line. Up to 200 characters per side.
- Lines starting with `#` are treated as comments and ignored.
- Blank lines are skipped.
- For CSV with commas inside a field, quote it: `"hello, world",greeting`. Use `""` to escape a literal quote.
- Pipe and tab lines split on the first delimiter only — extra delimiters stay in the back side.

Three ways to load cards:

1. **Choose file** — accepts `.txt`, `.csv`, `.tsv`, or any plain text file.
2. **Or paste cards here** — expand the section and paste delimited text directly.
3. **Use sample deck** — loads a built-in 10-card trivia deck so you can try the app immediately.

The [`Decks/`](Decks/) folder contains ready-to-use Spanish vocabulary decks in `.txt`, `.tsv`, and `.csv` form.

## Studying

- The card shows one side. **Click the card** (or press <kbd>Space</kbd> / <kbd>Enter</kbd>) to flip it.
- Once flipped, mark **Got it Right** (<kbd>1</kbd> or <kbd>Y</kbd>) or **Got it Wrong** (<kbd>2</kbd> or <kbd>N</kbd>).
- Right-marked cards leave the deck. Wrong-marked cards stay in rotation until you get them right.
- The session ends when the deck is empty. The "Misses logged" count tells you how many wrong attempts you made along the way.

### Options

- **Show first** — pick whether the front column, back column, or a random side starts face-up on each card.
- **Theme** — System, Light, or Dark (top-right of the page).

### Session controls

- **Restart session** — reshuffle all the originally loaded cards and start over with stats reset.
- **Load different deck** — return to the loader and clear the saved session.

## Persistence

Your deck and progress are saved to `localStorage` after every action, so closing the tab and reopening the app resumes where you left off. **Load different deck** clears that saved state.

Theme preference is saved separately under `flashcards.theme`.
