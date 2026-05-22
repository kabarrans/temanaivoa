/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const VOICE_OPTIONS = [
  { name: "Kore", gender: "Female", style: "Balanced, Natural", id: "Kore", desc: "Suara wanita muda yang jernih dan santai." },
  { name: "Fenrir", gender: "Male", style: "Deep, Cinematic", id: "Fenrir", desc: "Suara pria berat, dalam, dan berwibawa." },
  { name: "Aoede", gender: "Female", style: "Emotional, Storyteller", id: "Aoede", desc: "Sangat ekspresif dan emosional." },
  { name: "Charon", gender: "Male", style: "Authoritative, News", id: "Charon", desc: "Tegas, serius, dan terpercaya." },
  { name: "Leda", gender: "Female", style: "Soft, ASMR", id: "Leda", desc: "Lembut, menenangkan, dan halus." },
  { name: "Orion", gender: "Male", style: "Casual, Friendly", id: "Orus", desc: "Seperti teman ngobrol sehari-hari." },
  { name: "Nyx", gender: "Female", style: "Confident, Ads", id: "Callirrhoe", desc: "Modern, percaya diri, dan 'mahal'." },
  { name: "Atlas", gender: "Male", style: "Professional, Edu", id: "Puck", desc: "Jelas, artikulatif, dan cerdas." },
  { name: "Selene", gender: "Female", style: "Elegant, Premium", id: "Erinome", desc: "Elegan, dewasa, dan sophisticated." },
  { name: "Ares", gender: "Male", style: "Hype, Energetic", id: "Zephyr", desc: "Cepat, penuh energi, dan semangat." },
  { name: "Luna", gender: "Female", style: "Empathetic, Soft", id: "Autonoe", desc: "Suara penuh empati dan kehangatan." },
  { name: "Titan", gender: "Male", style: "Deep, Gravelly", id: "Enceladus", desc: "Suara pria sangat berat dan berkarakter." },
  { name: "Nova", gender: "Male", style: "Broadcast, Radio", id: "Iapetus", desc: "Suara penyiar radio klasik." },
  { name: "Vega", gender: "Male", style: "Calm, Narrator", id: "Umbriel", desc: "Tenang, stabil, dan datar." },
  { name: "Lyra", gender: "Female", style: "Formal, Corporate", id: "Algieba", desc: "Sangat formal dan profesional." },
  { name: "Rhea", gender: "Female", style: "Friendly, CS", id: "Despina", desc: "Ramah, membantu, dan ceria." },
  { name: "Rigel", gender: "Male", style: "Fast, Promo", id: "Algenib", desc: "Cepat dan to-the-point." },
  { name: "Sirius", gender: "Male", style: "Audiobook, Story", id: "Rasalgethi", desc: "Gaya mendongeng klasik." },
  { name: "Gaia", gender: "Female", style: "Mature, Warm", id: "Laomedeia", desc: "Dewasa dan menenangkan." },
  { name: "Zenith", gender: "Male", style: "Tech, Futuristic", id: "Achernar", desc: "Bersih, modern, dan digital." }
];

export const DELIVERY_STYLES = [
  { id: "semangat", name: "Semangat (Energetic)", icon: "Zap", prompt: "Suara penuh energi, antusias tinggi, tempo cepat, dan sangat bertenaga." },
  { id: "profesional", name: "Profesional", icon: "Briefcase", prompt: "Suara berwibawa, artikulasi sangat jelas, formal, meyakinkan." },
  { id: "santai", name: "Santai (Casual)", icon: "Coffee", prompt: "Gaya bicara rileks, seperti ngobrol dengan teman akrab, tidak kaku." },
  { id: "ceria", name: "Ceria (Happy)", icon: "Smile", prompt: "Nada suara tersenyum (smiling voice), bahagia, uplifting, dan positif." },
  { id: "sedih", name: "Sedih (Sad)", icon: "Frown", prompt: "Nada rendah, lambat, terdengar sedih, kecewa, atau berduka." },
  { id: "marah", name: "Marah (Angry)", icon: "Flame", prompt: "Nada tinggi, tegas, tajam, intens, dan terdengar kesal." },
  { id: "berbisik", name: "Berbisik (Whisper)", icon: "User", prompt: "Suara sangat pelan, berbisik dekat microphone, mendesah." },
  { id: "dramatis", name: "Dramatis (Dramatic)", icon: "Theater", prompt: "Penuh penekanan, jeda yang intens, emosional, teatrikal." },
  { id: "tenang", name: "Tenang (Calm)", icon: "Wind", prompt: "Sangat stabil, lembut, datar, menenangkan, cocok untuk meditasi." },
  { id: "informatif", name: "Informatif (News)", icon: "Newspaper", prompt: "Objektif, jelas, netral, faktual, seperti pembaca berita." },
  { id: "teriak", name: "Teriak (Shouting)", icon: "Megaphone", prompt: "Volume suara keras, intensitas tinggi, memanggil." },
  { id: "ngosngosan", name: "Ngos-ngosan (Panting)", icon: "Activity", prompt: "Suara terengah-engah, nafas berat dan cepat." },
  { 
    id: "cdrama_cinematic_v2", 
    name: "Drama China (Cinematic V2)", 
    icon: "Clapperboard", 
    prompt: `SYSTEM INSTRUCTION — DRAMA_CINA_CINEMATIC_LOCK_V2

You are a cinematic voice performance engine.

Your task is to deliver the script in authentic modern Chinese drama style (urban romance / elite family conflict tone).
You must prioritize emotional realism, cinematic pacing, and controlled intensity.

You are NOT allowed to read text in neutral tone.

EMOTIONAL CORE RULE:
1. Analyze the emotional context of the script.
2. Identify dominant emotion:
   - Longing
   - Regret
   - Contained anger
   - Emotional confession
   - Betrayal
   - Silent heartbreak
3. Build a gradual emotional curve (controlled beginning → emotional rise → peak → soften).

Flat delivery is strictly forbidden.

VOICE DNA (MANDATORY):
- Pace: 0.88x natural speed (never fast)
- Tone: Warm, slightly lowered pitch baseline
- Projection: Soft but emotionally weighted
- Emotion layering: Minimum 3 dynamic levels
- Breath: Natural cinematic breathing before emotional lines
- Articulation: Clear, deliberate emphasis on key words
- No shouting
- No exaggerated theatrical tone

DRAMATIC PAUSE SYSTEM:
- Comma pause: 0.25–0.4 seconds
- Emotional sentence ending: 0.6–0.8 seconds
- Major emotional reveal: up to 1.0 second
- Insert subtle breath before confession or confrontation lines
Pauses must feel organic, not mechanical.

CHARACTER LOCK MODE (STRICT):
- Lock timbre, resonance, and emotional tone from first line to last.
- No pitch drift.
- No tonal reset mid-script.
- Maintain identical character identity across entire generation.
- Do not switch personality mid-delivery.

PERFORMANCE BEHAVIOR:
- Deliver as if in a high-budget romantic Chinese drama scene.
- Emotion must feel internalized, restrained, mature.
- Avoid monotone reading.
- Avoid cheerful tone.
- Avoid robotic rhythm.
- Prioritize cinematic realism.

STRICTLY PROHIBITED:
- Neutral news-reader tone
- Fast pacing
- Mechanical pause timing
- Emotional flatline delivery

OUTPUT RULE:
- Do NOT rewrite the script.
- Do NOT summarize.
- Do NOT add narration.
- Only transform delivery style.

Optional Enhancement:
- Add subtle vocal trembling during vulnerable lines.
- Use slightly lower vocal register during confrontation lines.
- Increase emotional intensity by 15% at peak moment, then soften naturally.` 
  }
];
