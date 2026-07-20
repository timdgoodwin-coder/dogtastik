# Doggy Jingle Survey — Build Spec

8 questions, in order. Field types and options included so this can be coded directly.

---

### 1. Dog's Name & Breed
- **Type:** Two short text fields, plus an optional nickname field
  - `dog_name` (text, required)
  - `dog_breed` (text, required — free text, since mixes/unknowns are common)
  - `dog_nickname` (text, optional — free text, e.g. "Rusty-Bear, Big R, Sir Barks-a-lot")

### 2. Personality (pick 3)
- **Type:** Multi-select, exactly 3 required
- **Field name:** `personality_traits`
- **Options (grouped for display, flat list for storage):**

  **Playful / Energetic**
  - Goofy
  - Energetic
  - Mischievous
  - Silly
  - Playful
  - Adventurous

  **Affectionate**
  - Loving
  - Cuddly
  - Loyal
  - Gentle
  - Sweet
  - Affectionate

  **Calm / Composed**
  - Chill
  - Laid-back
  - Dignified
  - Independent
  - Wise
  - Patient

  **Bold / Confident**
  - Brave
  - Confident
  - Protective
  - Stubborn
  - Fearless
  - Bossy

  **Quirky / Anxious**
  - Anxious
  - Clingy
  - Dramatic
  - Nervous
  - Shy
  - Quirky

- **Validation:** exactly 3 selected, error otherwise.

### 3. Funniest/Most "Them" Habit
- **Type:** Free text (textarea)
- **Field name:** `funny_habit`
- **Placeholder:** "e.g. always has a toy in their mouth, does the zoomies after baths, tilts their head at every question..."
- **Required:** yes

### 4. What They Love Most
- **Type:** Free text (short text)
- **Field name:** `favorite_thing`
- **Placeholder:** "e.g. treats, walks, squirrels, belly rubs, car rides..."
- **Required:** yes

### 5. What They're Scared Of / Hate
- **Type:** Free text (short text)
- **Field name:** `fear_or_dislike`
- **Placeholder:** "e.g. the vacuum, thunderstorms, the mail carrier, baths..."
- **Required:** yes

### 6. Favorite Person & Relationship
- **Type:** Two fields
  - `favorite_person` (text, e.g. "Dad", "Mom", "my son Jake")
  - `relationship_note` (short text, optional — e.g. "always follows him around", "her best friend since she was a puppy")
- **Required:** favorite_person required; relationship_note optional

### 7. Signature Sound or Catchphrase Moment
- **Type:** Multi-select + "Other" free text fallback
- **Field name:** `signature_sound`
- **Options:**
  - Talks/grumbles with toys in mouth
  - Howls (at sirens, music, etc.)
  - Snores loudly
  - Sighs or groans dramatically
  - Whines/yips with excitement
  - Growls playfully during play
  - Barks at something specific (mirror, doorbell, mail carrier)
  - Other: ___________ (free text)
- **Validation:** at least 1 selected, or "Other" text filled in.

### 8. Desired Vibe — Golden Record only
- **Shown only for the Golden Record package.** Puppy Jingle buyers do not see this question and `vibe` is submitted as an empty string (we choose the vibe for them).
- **Type:** Single-select (radio/cards)
- **Field name:** `vibe`
- **Options:**
  - Silly & Upbeat
  - Sweet & Heartfelt
  - Epic Rock Anthem
  - Fun Country/Folk Sing-Along
  - Quirky & Comedic
- **Required:** yes
- **Optional UX enhancement:** pre-select/highlight a suggested option based on `personality_traits` picks (e.g. "Goofy" + "Mischievous" → suggest "Silly & Upbeat" or "Quirky & Comedic"), but always let the customer override.

---

## Data object shape (for reference)

```json
{
  "dog_name": "Chester",
  "dog_breed": "Golden Retriever",
  "dog_nickname": "Chessie, Big Man",
  "personality_traits": ["Loving", "Goofy", "Cuddly"],
  "funny_habit": "always having a toy in their mouth",
  "favorite_thing": "their humans",
  "fear_or_dislike": "the wind",
  "favorite_person": "Dad",
  "relationship_note": "",
  "signature_sound": "Talks/grumbles with toys in mouth",
  "signature_sound_other": "",
  "vibe": "Silly & Upbeat"
}
```

This maps directly to the placeholders in the lyric-generation skill — no reformatting needed between the survey submission and the prompt.
