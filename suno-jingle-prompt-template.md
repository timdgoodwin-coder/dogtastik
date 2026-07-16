# Suno Prompt Template — Doggy Jingle

Suno doesn't accept "make this 45 seconds" as a literal instruction — song length is controlled by **how much lyric/structure content you give it**, plus the style tags. This template handles both: it maps your desired length to a structure, and formats everything the way Suno's Custom Mode expects (Style + Lyrics fields).

---

## Step 1: Map desired length to structure

| Target length | Structure to use |
|---|---|
| ~15–20 sec | [Chorus] only |
| ~30 sec | [Verse] + [Chorus] |
| ~45–60 sec | [Verse 1] + [Chorus] + [Verse 2] |
| ~90 sec – 2 min | [Verse 1] + [Chorus] + [Verse 2] + [Chorus] (+ optional [Bridge]) |
| 2 min+ | Full structure: [Intro] + [Verse 1] + [Chorus] + [Verse 2] + [Chorus] + [Bridge] + [Chorus] + [Outro] |

Pick the row matching `{{desired_length}}` and use that structure when you drop in the lyrics from the jingle-writing step.

---

## Step 2: Suno Custom Mode fields

**Style of Music field** (200-character limit — order tags as Genre → Mood → Instruments → Vocals → Production, with the most important tags first since Suno weights earlier tags more heavily):
```
{{genre_from_vibe}}, {{mood_descriptors}}, {{key_instruments}}, {{vocal_type}}, clear mix, {{tempo}} BPM
```
*(e.g. "upbeat pop-punk, playful, energetic, driving electric guitar, clear male vocals, radio-ready mix, 140 BPM")*

**Lyrics field:**
```
[Intro]
{{optional short instrumental or ad-lib cue, e.g. "(woof woof, here we go!)"}}

[Verse 1]
{{verse_1_lyrics}}

[Chorus]
{{chorus_lyrics}}

[Verse 2]
{{verse_2_lyrics}}

[Chorus]
{{chorus_lyrics}}

[Outro]
{{optional closing line, e.g. dog's name repeated once more}}
```

Only include the sections that match the structure you picked in Step 1 — delete the rest.

**Title field:**
```
{{dog_name}}'s Theme Song
```

---

## Notes on controlling length in Suno
- Current Suno models can generate up to about 8 minutes before you'd need to use Extend — so left alone, Suno will often pad a short jingle out much longer than you want. Lyric/structure length (Step 1) is your main lever for keeping it short, not a duration setting.
- For jingles under 30 seconds, generate the shortest structure (Chorus only, or Verse + Chorus), then use Suno's **Crop** tool (available on Pro/Premier plans) to trim any excess intro or outro rather than relying on it to stop exactly on time.
- The Lyrics field allows up to 3,000 characters and the Style field up to 200 — keep both lean for short jingles, since more content generally invites a longer arrangement.
- If a generation runs long or the ending feels abrupt, **Extend** lets you add sections, and **Replace Section** (Pro/Premier) lets you redo a specific part without regenerating the whole track — useful for polishing a jingle without starting over.
- For a very precise runtime (e.g. exactly 20 seconds for a web player), generate the closest short structure, then trim/fade in an audio editor — this remains the standard workflow rather than expecting exact-length output straight from Suno.
