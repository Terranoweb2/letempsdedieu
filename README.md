<p align="center">
  <img src="screenshots/logo.png" alt="Le Temps de Dieu" width="120" />
</p>

<h1 align="center">Le Temps de Dieu</h1>

<p align="center">
  <strong>Assistant IA interreligieux avec mode vocal intelligent</strong><br>
  Explorez les textes sacres, comparez les religions, posez vos questions.
</p>

<p align="center">
  <a href="https://voietv.org">Site Web</a> &bull;
  <a href="https://voietv.org/app/">Application</a> &bull;
  <a href="https://voietv.org/downloads/le-temps-de-dieu.apk">APK Android</a>
</p>

---

## Captures d'ecran

<p align="center">
  <img src="screenshots/landing-page.jpg" alt="Page d'accueil" width="700" /><br>
  <em>Page d'accueil — voietv.org</em>
</p>

<p align="center">
  <img src="screenshots/chat-app.jpg" alt="Interface de chat" width="700" /><br>
  <em>Interface de chat avec IA</em>
</p>

## Fonctionnalites

### Chat IA Multi-Modeles
- DeepSeek V3 (Ultra Rapide), GPT-4o, Claude Sonnet/Opus, Gemini
- Reponses en streaming temps reel
- Historique de conversations avec recherche

### Mode Vocal Intelligent (Vortex)
- **Mains libres** : detection automatique du silence (1.2s), pas de bouton a appuyer
- **Pipeline phrase par phrase** : la voix commence des la premiere phrase generee
- **Interruption vocale** : parlez pendant la reponse pour interrompre l'IA
- **4 voix Microsoft Neural** : Vivienne (chaleureuse), Denise, Henri, Eloise
- **Transcription ultra-rapide** : Groq Whisper Turbo (< 1s)
- **Fin automatique** : dites "merci" ou "au revoir" pour fermer
- **Son de reflexion** : feedback audio pendant la generation

### Textes Religieux
- Specialise en islamologie et religion comparee
- References aux hadiths (Sahih al-Bukhari, Muslim)
- Analyse critique des textes sacres
- Sources citees avec numeros de versets

### Createur de Livres
- Generation de livres complets avec IA
- Couverture, chapitres, table des matieres
- Export et publication

### Boutique
- Achat de livres generes par la communaute
- Paiement mobile (Orange Money, MTN MoMo)

## Architecture

```
voietv.org
    |
    +-- Nginx (reverse proxy, rate limiting)
    |     |
    |     +-- /app/ --> Vite Frontend (port 4173)
    |     +-- /api/ --> Express Backend (port 3000)
    |     +-- /api/tts --> Edge TTS Neural
    |     +-- /api/transcribe --> Groq Whisper
    |
    +-- PostgreSQL (users, conversations, books)
    +-- Redis (sessions, usage tracking, cache)
    +-- OpenRouter API (LLM multi-modeles)
    +-- Edge TTS (synthese vocale Microsoft Neural)
    +-- Groq API (transcription Whisper ultra-rapide)
```

## Stack Technique

| Composant | Technologie |
|-----------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Express.js + TypeScript (tsx) |
| Base de donnees | PostgreSQL + Prisma ORM |
| Cache | Redis |
| LLM | OpenRouter (DeepSeek, GPT-4o, Claude, Gemini) |
| TTS | Microsoft Edge Neural (edge-tts) |
| STT | Groq Whisper Large V3 Turbo |
| Auth | JWT (access + refresh tokens) |
| Mobile | WebView Android (APK 3 MB) |
| Deploiement | Docker + Nginx + VPS |

## Pipeline Vocal

```
Utilisateur parle
    |
    v
[Silence 1.2s detecte] --> [Groq Whisper < 1s]
    |
    v
[LLM streaming phrase par phrase]
    |                          |
    v                          v
[TTS phrase 1] --> [AUDIO]   [TTS phrase 2] --> queue
    |
    v
[Re-ecoute automatique]
    |
    v
"Merci" / "Au revoir" --> [Fermeture auto]
```

## Deploiement

```bash
# Frontend
cd letempsdedieu && npm run build

# Backend
docker compose up -d

# APK Android (WebView)
cd ltdd-android-local && ./gradlew assembleDebug
```

## Licence

Projet prive - Tous droits reserves.
