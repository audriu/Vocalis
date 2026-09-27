# Vocalis 🎙️ — Presentation Pitch Deck

**AssemblyAI - Voice Agent Hackathon 2026**  
**Team**: Vocalis Studio (`neural-nomads`)  
**Live Interactive Slides**: [Open /slides.html in your browser](http://localhost:3000/slides.html)

---

## Slide 1: Cover Slide
# Vocalis: Speak. Analyze. Improve.
### The Fastest Path to Becoming a Stage-Ready Public Speaker & Hackathon Pitcher
**Powered by AssemblyAI Voice Agents**

* 🎙️ **AssemblyAI Voice Agent API**: Real-time bidirectional conversational coach
* ⚡ **Universal-3.5 STT**: Keyterms prompting, disfluencies, and diarization
* 🧠 **AssemblyAI LLM Gateway**: Structured post-speech critique and techniques
* 🏆 **Hackathon Pitch Mode**: Built for founders and hackathon teams

---

## Slide 2: The Problem
# Great Ideas Die from Poor Delivery
1. **73% Suffer from Speech Anxiety (Glossophobia)**  
   Public speaking is terrifying, yet most people only practice when the stakes are high.
2. **$150–$300/hour for Professional Coaching**  
   Coaching is inaccessible to everyday builders. Passive YouTube videos and books provide tips, but you only improve when you open your mouth and speak.
3. **No Practice Under Pressure**  
   Founders rehearse silently in their heads. When faced with a 3-minute hackathon clock or judge panel, they ramble, exceed limits, and bury their product demo.

---

## Slide 3: The Solution
# The Deliberate Practice Training Loop
Vocalis turns speech practice into a repeatable muscle-memory habit:

1. **Timed Spontaneous Takes**: Select an impromptu prompt or rehearse your hackathon pitch under 60s, 180s, or 300s constraints.
2. **Deep Voice Signal Analysis**: Automatic detection of speech rate, filler words ("um", "uh"), signposts, concrete examples, and topic relevance.
3. **Conversational Voice Coach**: Speak with an AI coach that listens, pauses when you speak, roleplays as a hackathon judge, and recites an improved version of your speech.

---

## Slide 4: Signature Feature
# Hackathon Pitch Training Mode
*Built specifically for hackathon participants and startup founders.*

* **3 Pitch Length Formats**:
  * **1-Minute Elevator Pitch**: Hook, problem, solution, and impact.
  * **3-Minute Standard Pitch**: Problem depth, solution, demo story, and future vision.
  * **5-Minute Presentation**: Architecture walkthrough, traction, and business case.
* **Judge-Grade Evaluation Metrics**:
  * *Problem & Solution Clarity*
  * *Pitch Structure (Hook → Problem → Solution → Demo → Impact)*
  * *Demo & Evidence (technical feasibility and live demo presence)*
  * *Pacing Against Clock (speaking rate calibrated for high-stakes pitches)*

---

## Slide 5: Deep AssemblyAI Integration
# Built on AssemblyAI's Core Voice Infrastructure

### 1. Voice Agent WebSocket API (`wss://agents.assemblyai.com/v1/ws`)
* 24kHz full-duplex streaming via browser `AudioWorklet`.
* Instant natural voice interruption handling (pauses playback when the user speaks).
* Hackathon judge/mentor roleplaying system prompt.

### 2. Universal-3.5 Pro Speech-to-Text (`/api/transcribe`)
* **Keyterms Prompting**: User project names, teammates, and tech jargon recognized accurately.
* **Disfluencies (`disfluencies: true`)**: Hesitations preserved to measure filler rate accurately.
* **Speaker Diarization & Entity Detection**: Identifies speakers and detects organizations/people.

### 3. AssemblyAI LLM Gateway (`/api/analyze`)
* Hosted LLM endpoint with JSON repair for structured coaching insights.

---

## Slide 6: Product Architecture & Quality
# Production-Ready Engineering
* **Modern Stack**: Next.js 16 + React 19 + TypeScript + Tailwind CSS.
* **AudioWorklet Node**: High-performance audio streaming without UI stutter.
* **Server-Side Token Minting**: Protects API keys via ephemeral tokens (`/api/voice-token`).
* **Automated Test Suite**: 12 Playwright unit tests verifying speech signals, pitch metrics, and rewards.
* **Strict React 19 Compliance**: 0 lint errors, 0 type errors, 100% production build pass.

---

## Slide 7: Business Model & Retention
# Gamified Practice & Enterprise Expansion
* **Points Economy**: Earn points per practice session and daily challenges to unlock longer talk times and expanded keyterm allowances.
* **Keyterms as a Scarcity Resource**: Packages AssemblyAI's keyterm capacities into Free, Points-unlocked, and Pro tiers.
* **B2B Opportunity**: Pitch coaching for university incubators, accelerator demo days, and enterprise sales teams.

---

## Slide 8: The Vision
# Ready to Elevate Your Voice?
*Deliberate practice makes extraordinary speakers.*

* **Try Pitch Training Mode**: [http://localhost:3000/practice/hackathon-pitch](http://localhost:3000/practice/hackathon-pitch)
* **Interactive Slide Deck**: [http://localhost:3000/slides.html](http://localhost:3000/slides.html)
* **GitHub Repository**: [https://github.com/kalp12265/Vocalis](https://github.com/kalp12265/Vocalis)
