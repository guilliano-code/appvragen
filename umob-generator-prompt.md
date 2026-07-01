# Prompt: Umob Question Generator App

Copy alles hieronder en plak in Claude Code. Het genereert één werkende `index.html` die je direct in je browser (of op je telefoon) kunt openen.

---

## OPDRACHT

Bouw een mobile-first web-app in **één enkel HTML-bestand** (`index.html`) die viral quiz-vragen genereert voor Umob's social media content. De app moet werken door het bestand simpelweg in een browser te openen — geen npm install, geen build step, geen server.

De app roept de Anthropic Claude API rechtstreeks aan vanuit de browser (`claude-sonnet-4-6`). Sla de API key op in `localStorage` en vraag hem alleen bij eerste gebruik.

## MERK-CONTEXT: UMOB

Umob is een Nederlandse mobiliteitsapp die alle deelvervoer-aanbieders (deelscooters, deelfietsen, deelauto's, taxi, OV, e-bikes) samenbrengt in één app. Kerncijfers:
- 20+ landen actief
- 260+ steden bediend
- Eén account voor alle aanbieders (geen 15 losse apps meer)
- Vergelijk prijzen en reistijd tussen aanbieders
- Pay-in-the-app (geen los betalen)
- Tone: modern, snel, urban, praktisch, jong-professioneel

De vragen worden gebruikt voor een social media-format: een fysiek draairad waar mensen aan draaien, een categorie krijgen, en dan een vraag moeten beantwoorden. 3 vragen per persoon, 2/3 goed = giftcard. Video's van ~30-40 sec voor Reels/TikTok. Doel: views, engagement, naamsbekendheid voor Umob.

## TECH STACK

- Single-file HTML (`index.html`) met inline CSS en JavaScript
- Vanilla JS, geen frameworks, geen build step
- Direct `fetch()` naar `https://api.anthropic.com/v1/messages` met header `anthropic-dangerous-direct-browser-access: true`
- Model: `claude-sonnet-4-6` (fallback: laat de code makkelijk aanpasbaar zijn)
- `localStorage` voor API key én voor question history (dedupe)

## UI/UX SPECIFICATIE

### Layout
- Mobile-first (design vanaf 375px breed), scale up voor desktop
- Umob-achtige branding: zachte gradient achtergrond (paars-blauw), witte cards, ronde hoeken (border-radius 16-24px), moderne sans-serif (system font stack)
- Hoofdlayout: titel bovenaan, dan een 3x2 grid met 6 categorie-knoppen, daaronder een grote "🎲 Random" knop over de volle breedte
- Onderin: kleine link "Historie" (toont eerder gegenereerde vragen) en "Instellingen" (API key wijzigen, alles wissen)

### Categorie-knoppen (7 totaal)
Elke knop is groot (minimaal 80px hoog op mobiel), heeft een emoji + label:
1. 🏙️ Steden & Landen
2. 🛴 Vervoer-type
3. 🧠 Slimme reiziger
4. 📱 Umob-app
5. 💡 Wist je dat
6. ⚔️ Battle (hot takes / would you rather)
7. 🎲 Random (over de volle breedte)

De Random knop kiest willekeurig één van de 6 categorieën én willekeurig het type (Umob of adjacent — zie regels hieronder).

### Modal popup (kritiek)
Zodra een vraag is gegenereerd, verschijnt een **modal popup** die:
- Fullscreen op mobiel, gecentreerd op desktop (max 500px breed)
- Toont: categorie-badge, moeilijkheidsgraad-badge, type-badge (Umob/Adjacent), de vraag groot en leesbaar, de 3 opties (A/B/C) als klikbare cards, een verborgen "Toon antwoord" sectie die klapt open bij klik, met daarin het juiste antwoord + weetjes-zin
- Onderin: knoppen "Kopieer" (kopieert vraag+antwoord naar klembord) en "Nog één" (genereert nieuwe vraag in dezelfde categorie)
- Sluit **alleen** met een duidelijke X-knop rechtsboven. Klikken op backdrop doet niks. Escape-toets doet niks. Zwipe-down doet niks. Dit is essentieel.

### Loading state
Terwijl vraag wordt gegenereerd: modal opent meteen met een loader (spinner + tekst "Vraag wordt gemaakt..."). Voelt sneller aan dan wachten en dan pas modal openen.

## GENERATIE-REGELS

### 50/50 Umob vs Adjacent
Elke keer dat er een vraag wordt gegenereerd, gooi eerst een virtuele dobbelsteen (Math.random() < 0.5):
- **Umob-specifiek**: vraag gaat over Umob zelf, de app, aanbieders in Umob, dekking, prijzen in de app, features. Antwoord is vaak alleen te weten als je Umob kent of goed geraden hebt.
- **Adjacent**: vraag gaat over mobiliteit/reizen/steden algemeen — deelscooter-weetjes wereldwijd, oudste/snelste vervoer, opvallende feiten over steden, groenste transport, etc. Niet direct Umob, wel on-brand voor de doelgroep.

Toon in de modal welk type de vraag is (badge "Umob" of "Adjacent").

Voor de Random-knop: eerst willekeurige categorie kiezen, dan willekeurig type, dan genereren.

### Moeilijkheidsverdeling
Per generatie ook random moeilijkheid: 40% makkelijk, 40% middel, 20% moeilijk.

### Dedupe
- Bereken een simpele hash van de vraagtekst (bijv. SHA-1 in browser via `crypto.subtle`)
- Voor elke gegenereerde vraag: check of hash al in `localStorage.umob_questions` staat
- Zo ja: automatisch opnieuw genereren (max 3 pogingen, daarna toon alsnog)
- Sla nieuwe vragen op met alle metadata

## GENERATIE-PROMPT (naar Claude API)

Voor elke API-call gebruik je een system prompt en user message. De system prompt bevat:

```
Je bent een expert social media strateeg gespecialiseerd in viral quiz content voor mobiliteitsmerken. Je schrijft vragen voor Umob — een Nederlandse mobiliteitsapp die alle deelvervoer-aanbieders in één app samenbrengt (20+ landen, 260+ steden, deelscooters/deelfietsen/deelauto's/OV/taxi).

Deze vragen worden gebruikt in TikTok/Reels-video's waar random voorbijgangers een draairad draaien en 3 vragen krijgen. Doel: 2/3 goed = giftcard.

REGELS voor virale vragen:
- Antwoord moet verrassend zijn ("wait, echt?") of controversieel genoeg om comments te triggeren
- Geen droge feitjes zonder karakter
- Multiple choice met 3 opties (A/B/C) waar minstens 2 opties plausibel klinken
- Geen inside jokes, geen technisch jargon
- Passen in ~10 seconden voorlezen (vraag + opties)
- Weetjes-zin na antwoord moet een "oh nice" moment geven voor de host om te zeggen

FORMAT (return exact JSON, geen extra tekst):
{
  "question": "de vraagtekst",
  "options": {"A": "...", "B": "...", "C": "..."},
  "correct": "A" | "B" | "C",
  "fact": "korte weetjes-zin die de host na het antwoord kan zeggen (max 20 woorden)",
  "type": "umob" | "adjacent",
  "difficulty": "makkelijk" | "middel" | "moeilijk"
}
```

De user message bevat de gekozen categorie, het type (Umob of adjacent), de moeilijkheid, en per categorie een korte beschrijving + 2 voorbeelden van goede vragen én 1 voorbeeld van een slechte vraag (few-shot). Sluit af met "Genereer nu ÉÉN nieuwe vraag in dit format. Alleen JSON."

### Categorie-definities (gebruik in user message per klik)

**🏙️ Steden & Landen**  
Doel: vragen over waar Umob actief is en welke steden bekend zijn om welk vervoer.  
Goed voorbeeld (umob): "In hoeveel landen kun je Umob gebruiken? A) 12+ B) 20+ C) 35+"  
Goed voorbeeld (adjacent): "Welke Europese hoofdstad heeft de langste metrolijn ter wereld? A) Londen B) Moskou C) Parijs"  
Slecht voorbeeld: "Wat is de hoofdstad van Nederland?" (te makkelijk, geen brand-fit)

**🛴 Vervoer-type**  
Doel: over verschillende manieren van deelvervoer, hun eigenschappen, kosten, snelheid.  
Goed voorbeeld (umob): "Welk vervoer vind je NIET in Umob? A) Deelscooter B) Waterfiets C) Deelauto"  
Goed voorbeeld (adjacent): "Wat is gemiddeld sneller in de Amsterdamse binnenstad? A) Auto B) E-bike C) Metro"  
Slecht voorbeeld: "Is een fiets ecologisch?" (te vaag, geen echt antwoord)

**🧠 Slimme reiziger**  
Doel: kosten/tijd vergelijken, slimste route kiezen, geldbesparen.  
Goed voorbeeld (umob): "Rit van 4 km in Amsterdam — wat is meestal het goedkoopst via Umob? A) Deelscooter B) Deelauto C) Taxi"  
Goed voorbeeld (adjacent): "Op welke afstand is fietsen gemiddeld sneller dan de auto in de stad? A) Onder 2 km B) Onder 5 km C) Onder 10 km"  
Slecht voorbeeld: "Wat is duurzaam reizen?" (te algemeen)

**📱 Umob-app**  
Doel: features en werking van de app zelf.  
Goed voorbeeld: "Hoeveel accounts heb je nodig om alle aanbieders in Umob te gebruiken? A) 1 B) 3 C) Per aanbieder één"  
Slecht voorbeeld: "Kun je de app downloaden?" (geen echte quiz)

**💡 Wist je dat**  
Doel: verrassende weetjes over mobiliteit die goed doen op social.  
Goed voorbeeld: "Welke stad had als eerste ter wereld een deelscooter-systeem? A) Los Angeles B) Berlijn C) Santa Monica"  
Slecht voorbeeld: "Wist je dat auto's rijden op benzine?" (basiskennis)

**⚔️ Battle (hot takes / would you rather)**  
Doel: opinion-driven vragen die comments triggeren. Er is geen "fout" antwoord — de host kan zelf een "juist" antwoord kiezen op basis van meerderheidsopinie of grap.  
Goed voorbeeld: "Wat is erger op de fiets? A) Regen in je gezicht B) Tegenwind C) Rood stoplicht bij elke kruising"  
Goed voorbeeld: "Kies één: A) Nooit meer OV B) Nooit meer auto C) Nooit meer fiets"  
Slecht voorbeeld: "Wat is beter, auto of fiets?" (te simpel, geen twist)

Voor Battle-vragen: markeer `correct` als de meest waarschijnlijke meerderheidskeuze, en zet in de `fact` iets als "meningen verdeeld — laat je antwoord in de comments!" zodat het engagement-driver is.

## KWALITEITSCRITERIA

Voor elke gegenereerde vraag geldt:
- Passen 3 opties elk in max 3 woorden? (Voor mobile display)
- Is de vraag begrijpelijk zonder context?
- Wordt iemand die dit fout heeft niet vernederd? (Fout mag, maar niet stom)
- Wordt iemand die dit goed heeft trots? (Correct mag, maar niet trivial)
- Zou een 25-jarige stedeling dit delen met vrienden?

## OUTPUT / HISTORIE / EXPORT

- Elke gegenereerde vraag komt in `localStorage.umob_questions` als array van objecten
- Historie-scherm: toont alle vragen gegroepeerd per categorie, met filter op type/moeilijkheid
- Export-knoppen in historie:
  - JSON download (`.json` bestand)
  - CSV download (`.csv` bestand, kolommen: categorie, type, moeilijkheid, vraag, A, B, C, correct, fact)
  - Kopieer alles naar klembord (als leesbare tekst)
- Wissen-knop in instellingen (met bevestiging)

## MOBILE-FIRST OPTIMALISATIE (kritiek)

- Alle touch targets minimaal 48x48px
- Font-size body minimaal 16px (voorkomt iOS zoom-in)
- Modal op mobiel: fullscreen (100vw x 100vh), rounded corners weg op mobile
- Modal op desktop: max-width 500px, gecentreerd, met backdrop-blur
- Categorie-knoppen: op mobiel 2 kolommen, op desktop 3 kolommen
- Random-knop: op mobiel volle breedte, sticky bottom-of-screen als je scrolt
- Geen `hover`-only effecten (gebruik ook `:active` en `:focus-visible`)
- `viewport meta tag` met `width=device-width, initial-scale=1`
- Gebruik `padding-bottom: env(safe-area-inset-bottom)` voor iPhone notch
- Test dat het werkt op Safari mobile (belangrijkste browser voor deze use case)
- Prefers-reduced-motion respecteren voor animaties

## FOUTAFHANDELING

- Geen API key ingesteld: modal opent met input-veld en link naar console.anthropic.com
- API-fout (400/500): modal toont duidelijke foutmelding in NL + retry-knop
- Rate limit (429): modal toont "Te snel gegenereerd, wacht 30 seconden" met countdown
- Netwerkfout: modal toont "Geen internet, probeer opnieuw" met retry
- JSON parse-fout van model: retry (tot 3x) met een strengere instructie in de prompt

## API KEY MANAGEMENT

- Bij eerste gebruik: welkom-modal met input-veld voor Anthropic API key + link naar de docs
- Sla op in `localStorage.anthropic_api_key`
- Instellingen-scherm heeft optie om key te wijzigen of te wissen
- Toon key nooit volledig, alleen laatste 4 tekens (`sk-ant-...abc1`)

## OUTPUT

Lever alles op als ÉÉN bestand: `index.html`. Klaar om te openen in browser (dubbelklik) of te hosten (bijv. GitHub Pages of Netlify voor mobiel gebruik).

Voeg geen README toe, geen extra bestanden, geen build config. Alleen `index.html`.

---

## KLAAR? BEGIN NU MET BOUWEN.
