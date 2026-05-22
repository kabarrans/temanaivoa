/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Lightbulb, 
  Camera, 
  Moon, 
  Sun, 
  Menu, 
  X, 
  ChevronDown, 
  Play, 
  StopCircle, 
  Wand2, 
  Key,
  Download, 
  Trash2, 
  ArrowRight, 
  Info,
  Volume2,
  Settings,
  Brain,
  Sparkles,
  Zap,
  Briefcase,
  Smile,
  Frown,
  Flame,
  User,
  Projector,
  Wind,
  Newspaper,
  Megaphone,
  Activity,
  Clapperboard,
  Coffee,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality } from "@google/genai";
import { VOICE_OPTIONS, DELIVERY_STYLES } from './constants';
import { pcmToWav, pcmToAudioBuffer, performTimeStretch, audioBufferToMp3Url } from './audioUtils';

// Icon mapping for delivery styles
const iconMap: Record<string, any> = {
  Zap,
  Briefcase,
  Coffee,
  Smile,
  Frown,
  Flame,
  User,
  Theater: Projector,
  Wind,
  Newspaper,
  Megaphone,
  Activity,
  Clapperboard
};

export default function App() {
  // -- CUSTOM API KEY STATE --
  const [customApiKey, setCustomApiKey] = useState(() => {
    return localStorage.getItem('TEMAN_AI_VOA_API_KEY') || '';
  });
  const [inputKey, setInputKey] = useState(customApiKey);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const ai = React.useMemo(() => {
    return new GoogleGenAI({ apiKey: customApiKey || process.env.GEMINI_API_KEY || '' });
  }, [customApiKey]);

  const handleSaveKey = () => {
    setApiKeyError(null);
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setApiKeyError("API Key tidak boleh kosong!");
      return;
    }
    if (!trimmed.startsWith("AIzaSy")) {
      setApiKeyError("Format API Key sepertinya kurang valid (biasanya diawali dengan 'AIzaSy...')");
      return;
    }
    localStorage.setItem('TEMAN_AI_VOA_API_KEY', trimmed);
    setCustomApiKey(trimmed);
    setIsApiKeyOpen(false);
  };

  const handleDeleteKey = () => {
    localStorage.removeItem('TEMAN_AI_VOA_API_KEY');
    setCustomApiKey('');
    setInputKey('');
    setApiKeyError(null);
    setIsApiKeyOpen(false);
  };
  
  // -- UI STATE --
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState<'tts' | 'idea' | 'photo'>('tts');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uiState, setUiState] = useState({ voice: true, style: true, control: false });

  // -- TTS CORE STATE --
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const [selectedStyle, setSelectedStyle] = useState(DELIVERY_STYLES[0].id);
  const [styleIntensity, setStyleIntensity] = useState(5);
  const [optimizationMode, setOptimizationMode] = useState<'optimized' | 'original'>('optimized');
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [weight, setWeight] = useState(0);
  const [volume, setVolume] = useState(0);
  const [articulation, setArticulation] = useState(0);

  // -- PROCESSING STATES --
  const [processing, setProcessing] = useState({ isLoading: false, step: "", error: null as string | null });
  const [previewState, setPreviewState] = useState({ playingVoiceId: null as string | null, isLoading: false, audio: null as HTMLAudioElement | null });
  const [articulationProcessing, setArticulationProcessing] = useState(false);
  const [lastGeneratedConfig, setLastGeneratedConfig] = useState({ text: "", voice: "", style: "", intensity: 5 });

  // -- RESULT STATE --
  const [result, setResult] = useState({
    previewUrl: null as string | null,
    downloadUrl: null as string | null,
    downloadSpeed: 1.0,
    refinedScript: null as string | null,
    modeUsed: "original",
    rawPCM: null as string | null
  });

  // -- GENERATOR STATES --
  const [ideaForm, setIdeaForm] = useState({ description: "", usp: "", contentType: "Iklan Media Sosial (TikTok/Reels)", language: "Bahasa Indonesia", count: 3 });
  const [ideaProcessing, setIdeaProcessing] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([]);
  const [uspProcessing, setUspProcessing] = useState(false);

  const [photoForm, setPhotoForm] = useState({ imageData: null as string | null, imageName: "", mimeType: "", contentType: "TikTok Affiliate", targetAge: "Gen Z (18 - 24 Tahun)", targetGender: "Semua Gender", language: "Bahasa Indonesia", count: 3 });
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [generatedPhotoScripts, setGeneratedPhotoScripts] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainAudioRef = useRef<HTMLAudioElement>(null);

  // -- EFFECTS --
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (mainAudioRef.current) {
      mainAudioRef.current.playbackRate = speed;
    }
  }, [speed, result.previewUrl]);

  // -- HANDLERS --
  const toggleSection = (section: keyof typeof uiState) => {
    setUiState(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePreview = async (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation();
    if (previewState.playingVoiceId === voiceId) {
      previewState.audio?.pause();
      setPreviewState({ playingVoiceId: null, isLoading: false, audio: null });
      return;
    }
    previewState.audio?.pause();
    setPreviewState({ playingVoiceId: voiceId, isLoading: true, audio: null });

    try {
      const targetVoice = VOICE_OPTIONS.find(v => v.id === voiceId);
      const textToSay = targetVoice ? targetVoice.desc : "Halo, ini adalah contoh suara saya.";
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: textToSay }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } }
        }
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) throw new Error("No audio returned");
      
      const wavUrl = pcmToWav(audioData);
      const newAudio = new Audio(wavUrl);
      newAudio.playbackRate = speed;
      newAudio.onended = () => setPreviewState({ playingVoiceId: null, isLoading: false, audio: null });
      newAudio.play();
      setPreviewState({ playingVoiceId: voiceId, isLoading: false, audio: newAudio });
    } catch (err: any) {
      setPreviewState({ playingVoiceId: null, isLoading: false, audio: null });
      console.error("Preview error:", err);
    }
  };

  const generateAudio = async () => {
    if (!text.trim()) return;
    
    const isRebakeOnly = result.rawPCM && 
                         text === lastGeneratedConfig.text && 
                         selectedVoice === lastGeneratedConfig.voice &&
                         selectedStyle === lastGeneratedConfig.style &&
                         styleIntensity === lastGeneratedConfig.intensity;

    const stepStart = isRebakeOnly ? "baking" : (optimizationMode === 'optimized' ? "analyzing" : "synthesizing");
    setProcessing({ isLoading: true, step: stepStart, error: null });

    try {
      let rawPcmData = result.rawPCM;

      if (!isRebakeOnly) {
        let scriptToRead = text;

        if (optimizationMode === 'optimized') {
          const voiceProfile = VOICE_OPTIONS.find(v => v.id === selectedVoice);
          const styleProfile = DELIVERY_STYLES.find(s => s.id === selectedStyle);
          const langInstruction = autoDetectLanguage 
            ? "Language: Detect the language of the Input Text. Output instructions and script in that SAME language." 
            : "Language: Indonesian.";

          const logicPrompt = `Role: Expert TTS Director. Task: Convert script to TTS instructions. ${langInstruction} Input: "${text}" Voice: ${voiceProfile?.name} Style: ${styleProfile?.name} intensity: ${styleIntensity}/10. Output ONLY instructions.`;
          
          const refineResp = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: logicPrompt
          });
          scriptToRead = refineResp.text || text;
          setResult(prev => ({ ...prev, refinedScript: scriptToRead }));
        }

        setProcessing(prev => ({ ...prev, step: "synthesizing" }));
        const ttsResp = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: scriptToRead }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } }
          }
        });

        rawPcmData = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        if (!rawPcmData) throw new Error("Synthesis failed");
      }

      setProcessing(prev => ({ ...prev, step: "baking" }));
      const audioBuffer = await pcmToAudioBuffer(rawPcmData!);
      const bakedBuffer = await performTimeStretch(audioBuffer, speed);
      const bakedMp3Url = audioBufferToMp3Url(bakedBuffer);

      setResult({
        previewUrl: pcmToWav(rawPcmData!),
        downloadUrl: bakedMp3Url,
        downloadSpeed: speed,
        refinedScript: result.refinedScript,
        modeUsed: optimizationMode,
        rawPCM: rawPcmData
      });
      setLastGeneratedConfig({ text, voice: selectedVoice, style: selectedStyle, intensity: styleIntensity });
      setProcessing({ isLoading: false, step: "completed", error: null });
    } catch (err: any) {
      setProcessing({ isLoading: false, step: "failed", error: err.message });
    }
  };

  const generateIdeas = async () => {
    if (!ideaForm.description) return;
    setIdeaProcessing(true);
    try {
      let instructions = "CRITICAL: Return ONLY the spoken words (dialogue). DO NOT include visual descriptions like 'Visual:', 'Scene:', 'Action:'. Just the script text.";
      if (ideaForm.contentType === "Iklan Media Sosial (TikTok/Reels)") {
        instructions += " MANDATORY: Because this is for TikTok Shop, EVERY script MUST end with a Call to Action to click the 'Keranjang Kuning' (Yellow Basket).";
        instructions += " DURATION CONSTRAINT: The script must be concise, targeting exactly 30 seconds reading time (approx 60-75 words).";
      }
      const prompt = `Role: Direct Response Copywriter. Task: Create ${ideaForm.count} short scripts in ${ideaForm.language} for ${ideaForm.contentType}. Product: ${ideaForm.description}. USP: ${ideaForm.usp}. ${instructions} Return ONLY JSON array of strings.`;
      const resp = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      setGeneratedIdeas(JSON.parse(resp.text || "[]"));
    } catch (err) { console.error(err); } 
    finally { setIdeaProcessing(false); }
  };

  const generateUSP = async () => {
    if (!ideaForm.description) return;
    setUspProcessing(true);
    try {
      const resp = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract short USP in Indonesian from: "${ideaForm.description}". Return ONLY text.`
      });
      setIdeaForm(prev => ({ ...prev, usp: resp.text?.trim() || "" }));
    } finally { setUspProcessing(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoForm(prev => ({ ...prev, imageData: (reader.result as string).split(',')[1], imageName: file.name, mimeType: file.type }));
    reader.readAsDataURL(file);
  };

  const generateScriptsFromPhoto = async () => {
    if (!photoForm.imageData) return;
    setPhotoProcessing(true);
    try {
      const prompt = `Analisa foto ini dan buatkan ${photoForm.count} script iklan ${photoForm.contentType} dalam ${photoForm.language} untuk ${photoForm.targetAge}. Return ONLY JSON array of strings.`;
      const resp = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: photoForm.mimeType || "image/jpeg", data: photoForm.imageData } }] }],
        config: { responseMimeType: "application/json" }
      });
      setGeneratedPhotoScripts(JSON.parse(resp.text || "[]"));
    } finally { setPhotoProcessing(false); }
  };

  const fixArticulation = async () => {
    if (!text) return;
    setArticulationProcessing(true);
    try {
      const resp = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Rewrite to improve Indonesian articulation/prosody for TTS by adding punctuation. Do not change words. Input: "${text}"`
      });
      setText(resp.text?.trim() || text);
    } finally { setArticulationProcessing(false); }
  };

  const stopPreview = () => {
    previewState.audio?.pause();
    setPreviewState({ playingVoiceId: null, isLoading: false, audio: null });
  };

  const insertTag = (tag: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + (before.length > 0 && !before.endsWith(' ') ? ' ' : '') + tag + (after.length > 0 && !after.startsWith(' ') ? ' ' : '') + after;
      setText(newText);
      setTimeout(() => {
        textareaRef.current?.focus();
        const finalPos = before.length + (before.length > 0 && !before.endsWith(' ') ? 1 : 0) + tag.length;
        textareaRef.current?.setSelectionRange(finalPos, finalPos);
      }, 0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans p-4 md:p-8">
      
      {/* HEADER */}
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
            Teman AI <span className="text-slate-800 dark:text-slate-100 not-italic font-light">Voa</span>
          </h1>
          <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Buat Suara Alami Dengan Satu Klik</span>
        </div>

        <div className="flex items-center gap-4 relative">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:text-indigo-600 transition-all"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all z-50"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="absolute top-full right-0 mt-4 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-2 z-40 overflow-hidden"
              >
                {[
                  { id: 'tts', label: 'TEXT TO SPEECH', sub: 'Buat suara dari teks', icon: Mic, color: 'indigo' },
                  { id: 'idea', label: 'IDEA TO SCRIPT', sub: 'Generasi ide konten', icon: Lightbulb, color: 'amber' },
                  { id: 'photo', label: 'PHOTO TO SCRIPT', sub: 'Analisa foto produk', icon: Camera, color: 'pink' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setCurrentView(item.id as any); setIsMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${currentView === item.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <div className={`p-2 rounded-lg ${currentView === item.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                      <item.icon size={18} />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-black tracking-tight">{item.label}</div>
                      <div className="text-[10px] opacity-60">{item.sub}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* API KEY SETTINGS BANNER */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-indigo-50/80 to-cyan-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-xl border border-indigo-100/50 dark:border-white/5 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                <Key size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>Kuota Penggunaan Gemini</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium leading-4 ${customApiKey ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {customApiKey ? '● Kunci Kustom Aktif' : '● Limit Bersama (Bawaan)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {customApiKey 
                    ? 'Aplikasi berjalan lancar menggunakan akun Google pribadi Anda tanpa batasan kuota bersama.' 
                    : 'Menggunakan API Key gratis bawaan. Jika terjadi limitasi ("Quota exceeded"), Anda bisa menggunakan API Key sendiri.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsApiKeyOpen(!isApiKeyOpen)}
              className="px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-indigo-600 transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
            >
              {isApiKeyOpen ? 'Tutup Pengaturan' : 'Gunakan API Key Sendiri'}
            </button>
          </div>

          <AnimatePresence>
            {isApiKeyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-indigo-100/30 dark:border-white/5 space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Gemini API Key Anda
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="password"
                          value={inputKey}
                          onChange={(e) => {
                            setInputKey(e.target.value);
                            setApiKeyError(null);
                          }}
                          placeholder="Masukkan AI Studio API Key (AIzaSy...)"
                          className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono"
                        />
                        {apiKeyError && (
                          <p className="text-xs text-rose-500 font-bold mt-1.5">{apiKeyError}</p>
                        )}
                      </div>
                      <div className="flex gap-2 h-10">
                        <button
                          onClick={handleSaveKey}
                          className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                        >
                          Simpan Kunci
                        </button>
                        {customApiKey && (
                          <button
                            onClick={handleDeleteKey}
                            className="px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                            title="Hapus Kunci & Kembali ke Bawaan"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-3.5 bg-blue-500/5 dark:bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-xs text-slate-600 dark:text-slate-300/80 leading-relaxed">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1">Cara mendapatkan API Key gratis:</span>
                    <ol className="list-decimal list-inside space-y-1 mt-1 font-medium">
                      <li>Buka halaman resmi <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-700">Google AI Studio</a>.</li>
                      <li>Login dengan akun Google pribadi Anda.</li>
                      <li>Klik tombol <strong className="text-indigo-600 dark:text-indigo-400">"Get API key"</strong> di pojok kiri atas/tengah.</li>
                      <li>Buat kunci baru (<strong className="text-indigo-600 dark:text-indigo-400">Create API Key</strong>), salin, dan tempel di kolom atas kemudian klik Simpan.</li>
                    </ol>
                    <p className="mt-2 text-[11px] opacity-75">
                      🔒 <strong>Keamanan Data:</strong> API Key Anda disimpan secara aman di browser Anda (Local Storage) dan langsung dikirim ke server resmi Google API. Tidak ada pihak ketiga yang dapat melihat atau mengakses kunci Anda.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <main className="max-w-7xl mx-auto">
        {currentView === 'tts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT SIDEBAR: VOICES & STYLES */}
            <div className="lg:col-span-4 space-y-4">
              {/* VOICE TALENT BOX */}
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden transition-all">
                <button 
                  onClick={() => toggleSection('voice')}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg"><Volume2 size={18} /></div>
                    <div className="text-left">
                      <div className="text-xs font-bold uppercase tracking-wider">Voice Talent</div>
                      <div className="text-[10px] text-slate-500">{VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name}</div>
                    </div>
                  </div>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform ${uiState.voice ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {uiState.voice && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-slate-100 dark:border-white/5"
                    >
                      <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
                        {VOICE_OPTIONS.map(voice => (
                          <div 
                            key={voice.id}
                            onClick={() => setSelectedVoice(voice.id)}
                            className={`group relative p-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${selectedVoice === voice.id ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-900 flex items-center justify-center text-[10px] font-bold shrink-0 border border-slate-300 dark:border-slate-700">
                              {voice.gender === 'Male' ? 'M' : 'F'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 overflow-hidden">
                                <span className="font-bold text-sm truncate">{voice.name}</span>
                                <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[9px] font-medium whitespace-nowrap opacity-70">{voice.style}</span>
                              </div>
                              <p className="text-[10px] opacity-60 truncate">{voice.desc}</p>
                            </div>
                            <button 
                              onClick={(e) => handlePreview(e, voice.id)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${previewState.playingVoiceId === voice.id ? 'bg-white text-indigo-600' : 'bg-black/5 text-slate-500 hover:bg-white/20'}`}
                            >
                              {previewState.playingVoiceId === voice.id && previewState.isLoading ? <Activity size={14} className="animate-pulse" /> : previewState.playingVoiceId === voice.id ? <StopCircle size={16} /> : <Play size={14} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* DELIVERY STYLE BOX */}
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
                <button 
                  onClick={() => toggleSection('style')}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 text-cyan-600 rounded-lg"><Sparkles size={18} /></div>
                    <div className="text-left">
                      <div className="text-xs font-bold uppercase tracking-wider">Delivery Style</div>
                      <div className="text-[10px] text-slate-500">{DELIVERY_STYLES.find(s => s.id === selectedStyle)?.name}</div>
                    </div>
                  </div>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform ${uiState.style ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {uiState.style && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-slate-100 dark:border-white/5"
                    >
                      <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                        {DELIVERY_STYLES.map(style => {
                          const StyleIcon = iconMap[style.icon] || Sparkles;
                          return (
                            <div key={style.id} className={`p-1 rounded-xl transition-all ${selectedStyle === style.id ? 'bg-slate-50 dark:bg-slate-900/50 shadow-inner' : ''}`}>
                              <button 
                                onClick={() => setSelectedStyle(style.id)}
                                className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${selectedStyle === style.id ? 'bg-cyan-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400'}`}
                              >
                                <StyleIcon size={16} />
                                <span className="font-bold text-sm tracking-tight">{style.name}</span>
                                {selectedStyle === style.id && <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-bold">{styleIntensity}/10</span>}
                              </button>

                              {selectedStyle === style.id && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                  className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-white/5 space-y-3"
                                >
                                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Intensity</span>
                                    <span className="text-cyan-600 dark:text-cyan-400">{styleIntensity === 10 ? 'MAXIMUM' : `${styleIntensity * 10}%`}</span>
                                  </div>
                                  <input 
                                    type="range" min="0" max="10" step="1" 
                                    value={styleIntensity} onChange={e => setStyleIntensity(Number(e.target.value))}
                                    className="w-full accent-cyan-600"
                                  />
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* SPEED CALIBRATION */}
              <div className="bg-amber-500/10 dark:bg-amber-500/5 backdrop-blur-xl rounded-2xl border border-amber-500/20 shadow-xl p-5 space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600">
                    <Zap size={14} /> Speed Calibration
                  </div>
                  <div className="text-lg font-black text-amber-600 font-mono tracking-tighter">
                    {speed.toFixed(1)}x
                  </div>
                </div>
                <input 
                  type="range" min="0.5" max="3.0" step="0.1" 
                  value={speed} onChange={e => setSpeed(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[9px] font-bold text-amber-700/60 uppercase">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Hyper</span>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/10 text-[10px] leading-relaxed text-amber-800 dark:text-amber-200/70">
                  <Info size={12} className="inline mr-2 mb-0.5" />
                  <strong>AI Note:</strong> Click "Generate" to bake the final audio with this speed at high quality.
                </div>
              </div>

              {/* ADVANCED CONTROLS */}
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
                <button 
                  onClick={() => toggleSection('control')}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg"><Settings size={18} /></div>
                    <div className="text-left">
                      <div className="text-xs font-bold uppercase tracking-wider">Prosody Controls</div>
                      <div className="text-[10px] text-slate-500">Fine-tune pitch and weight</div>
                    </div>
                  </div>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform ${uiState.control ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {uiState.control && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="p-5 border-t border-slate-100 dark:border-white/5 space-y-6">
                      {[
                        { label: 'Pitch', value: pitch, setter: setPitch, left: 'Deep', right: 'High' },
                        { label: 'Weight', value: weight, setter: setWeight, left: 'Thin', right: 'Heavy' },
                        { label: 'Volume', value: volume, setter: setVolume, left: 'Soft', right: 'Loud' },
                      ].map(ctrl => (
                        <div key={ctrl.label} className="space-y-2">
                          <div className="flex justify-between text-[11px] font-black uppercase text-slate-500">
                            <span>{ctrl.label}</span>
                            <span className="text-emerald-600">{ctrl.value > 0 ? `+${ctrl.value}` : ctrl.value}</span>
                          </div>
                          <input type="range" min="-5" max="5" step="1" value={ctrl.value} onChange={e => ctrl.setter(Number(e.target.value))} className="w-full accent-emerald-600" />
                          <div className="flex justify-between text-[9px] font-medium text-slate-400 uppercase">
                            <span>{ctrl.left}</span>
                            <span>{ctrl.right}</span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT EDITOR: INPUT & RESULTS */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { label: "Mendesah", code: "(mendesah)" }, 
                  { label: "Tertawa", code: "(tertawa)" }, 
                  { label: "Sedih", code: "(sedih)" }, 
                  { label: "Batuk", code: "(batuk)" }, 
                  { label: "Marah", code: "(marah)" }
                ].map(tag => (
                  <button 
                    key={tag.code} onClick={() => insertTag(tag.code)}
                    className="whitespace-nowrap px-4 py-2 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-600/20 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                  >
                    + {tag.label}
                  </button>
                ))}
              </div>

              <div className="relative group bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl transition-all focus-within:ring-4 focus-within:ring-indigo-500/10 h-[400px] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <div className="flex items-center gap-2"><Mic size={12} /> Director's Script Editor</div>
                  <div>Gunakan (tag) untuk efek suara</div>
                </div>
                <textarea 
                  ref={textareaRef}
                  value={text} onChange={e => setText(e.target.value)}
                  placeholder="Ketik naskah Anda di sini... (berbisik)"
                  className="w-full flex-1 p-8 bg-transparent outline-none resize-none text-xl leading-relaxed font-light dark:placeholder-slate-700 placeholder-slate-300"
                />
                <div className="p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-white/5">
                  <button 
                    onClick={fixArticulation} disabled={articulationProcessing || !text}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10px] font-black tracking-tight text-indigo-600 shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {articulationProcessing ? <Activity size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    AI PROSODY FIXER
                  </button>
                  <div className="text-[10px] font-mono text-slate-400">{text.length} CHARS</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${autoDetectLanguage ? 'bg-blue-500/10 text-blue-600' : 'bg-slate-100 text-slate-400'}`}><Languages size={18} /></div>
                    <div className="text-left">
                      <div className="text-[11px] font-black uppercase tracking-tighter">Language Detective</div>
                      <div className="text-[9px] text-slate-500">Auto-detecting English, Japan, etc.</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAutoDetectLanguage(!autoDetectLanguage)}
                    className={`w-10 h-5 rounded-full transition-all relative ${autoDetectLanguage ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoDetectLanguage ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${optimizationMode === 'optimized' ? 'bg-purple-500/10 text-purple-600' : 'bg-slate-100 text-slate-400'}`}><Zap size={18} /></div>
                    <div className="text-left">
                      <div className="text-[11px] font-black uppercase tracking-tighter">Director Mode</div>
                      <div className="text-[9px] text-slate-500">Enable AI stage instructions</div>
                    </div>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                    <button onClick={() => setOptimizationMode('original')} className={`px-3 py-1 rounded text-[10px] font-bold ${optimizationMode === 'original' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-400'}`}>RAW</button>
                    <button onClick={() => setOptimizationMode('optimized')} className={`px-3 py-1 rounded text-[10px] font-bold ${optimizationMode === 'optimized' ? 'bg-white dark:bg-slate-800 shadow-sm text-purple-600' : 'text-slate-400'}`}>SMART</button>
                  </div>
                </div>
              </div>

              <button 
                onClick={generateAudio} disabled={processing.isLoading || !text}
                className={`relative w-full py-5 rounded-3xl font-black text-sm tracking-widest uppercase transition-all overflow-hidden ${processing.isLoading || !text ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-2xl shadow-indigo-500/20 active:scale-[0.98]'}`}
              >
                {processing.isLoading && (
                  <motion.div 
                    initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 bg-white/20"
                  />
                )}
                <div className="relative flex items-center justify-center gap-3">
                  {processing.isLoading ? (
                    <><Activity size={20} className="animate-pulse" /> <span>{processing.step.toUpperCase()} SCENE...</span></>
                  ) : (
                    <><Projector size={20} /> <span>GENERATE VOICE OVER</span></>
                  )}
                </div>
              </button>

              <AnimatePresence>
                {result.previewUrl && !processing.isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-t-4 border-indigo-600 shadow-2xl space-y-6"
                  >
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/30 animate-pulse"><Volume2 size={24} /></div>
                      <div className="flex-1 space-y-2">
                        <audio ref={mainAudioRef} controls src={result.previewUrl} className="w-full h-8 opacity-90 dark:invert" />
                        <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-slate-400">
                          <span>Previewing @ {speed.toFixed(1)}x</span>
                          <span className="text-indigo-600">{VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name}</span>
                        </div>
                      </div>
                      <a 
                        href={result.downloadUrl || ''} 
                        download={`Audio_${speed}x.mp3`}
                        className="px-6 py-4 rounded-2xl bg-amber-500 text-white font-black text-xs flex items-center gap-3 hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all"
                      >
                        <div className="text-right flex flex-col leading-none">
                          <span>DOWNLOAD</span>
                          <span className="text-[9px] opacity-70 mt-1">HQ MP3</span>
                        </div>
                        <Download size={20} />
                      </a>
                    </div>
                    {result.refinedScript && result.modeUsed === 'optimized' && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 overflow-hidden">
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center gap-2"><Sparkles size={12} /> AI Director Instructions</div>
                        <p className="text-sm italic font-serif leading-relaxed text-slate-600 dark:text-slate-400 opacity-80 border-l-2 border-indigo-600 pl-4 py-1">
                          {result.refinedScript}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {currentView === 'idea' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-down">
            <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-white/5 shadow-xl space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl"><Brain size={24} /></div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Idea Generator</h2>
                  <p className="text-xs text-slate-500">Transform product description to viral scripts</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Products / Services</label>
                  <textarea 
                    value={ideaForm.description} onChange={e => setIdeaForm({...ideaForm, description: e.target.value})}
                    placeholder="Contoh: Kopi praktis tanpa ampas..."
                    className="w-full h-32 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                    <span>USP (Key selling point)</span>
                    <button onClick={generateUSP} disabled={uspProcessing} className="text-amber-500 hover:underline flex items-center gap-1">
                      {uspProcessing ? <Activity size={10} className="animate-spin" /> : <Sparkles size={10} />} Auto-generate
                    </button>
                  </div>
                  <input 
                    type="text" value={ideaForm.usp} onChange={e => setIdeaForm({...ideaForm, usp: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none"
                    placeholder="Keunggulan utama produk..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Language</label>
                    <select value={ideaForm.language} onChange={e => setIdeaForm({...ideaForm, language: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none text-xs appearance-none">
                      <option>Bahasa Indonesia</option>
                      <option>English</option>
                      <option>Japanese</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Count</label>
                    <div className="flex gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                       {[1, 3, 5].map(n => <button key={n} onClick={() => setIdeaForm({...ideaForm, count: n})} className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all ${ideaForm.count === n ? 'bg-white dark:bg-slate-800 shadow-md' : 'text-slate-400'}`}>{n} SCRIPT</button>)}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={generateIdeas} disabled={ideaProcessing || !ideaForm.description}
                  className="w-full py-5 rounded-2xl bg-amber-500 text-white font-black text-sm tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20"
                >
                  {ideaProcessing ? <Activity size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  GENERATE SCRIPTS
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
               {generatedIdeas.length > 0 ? (
                 <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 scrollbar-hide">
                   {generatedIdeas.map((script, idx) => (
                     <motion.div 
                       key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                       className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-lg group hover:border-amber-500/30 transition-all"
                     >
                        <div className="text-[10px] font-black tracking-widest text-amber-500 mb-4">VARIATION #{idx + 1}</div>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-6 font-light">{script}</p>
                        <button 
                          onClick={() => { setText(script); setCurrentView('tts'); }}
                          className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-900 group-hover:bg-indigo-600 text-slate-500 group-hover:text-white font-black text-xs flex items-center justify-center gap-3 transition-all"
                        >
                          USE THIS SCRIPT <ArrowRight size={16} />
                        </button>
                     </motion.div>
                   ))}
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-center p-12 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] opacity-30">
                   <Lightbulb size={64} className="mb-4" />
                   <h3 className="text-xl font-bold">Waiting for Ideas</h3>
                   <p className="text-sm max-w-xs mt-2">Isi detail produk dan klik tombol generate untuk melihat hasilnya di sini.</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {currentView === 'photo' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-down">
             <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl space-y-6">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-pink-500/10 text-pink-500 rounded-2xl"><Camera size={24} /></div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Photo to Script</h2>
                    <p className="text-xs text-slate-500">AI analysis for product photography</p>
                  </div>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative h-60 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden ${photoForm.imageData ? 'border-pink-500' : 'border-slate-200 dark:border-slate-800 hover:border-pink-300'}`}
                >
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  {photoForm.imageData ? (
                    <>
                      <img src={`data:${photoForm.mimeType};base64,${photoForm.imageData}`} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={40} className="mb-2" />
                        <span className="text-xs font-black">CHANGE PHOTO</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-8">
                       <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 group-hover:text-pink-500 transition-colors">
                         <Camera size={32} />
                       </div>
                       <p className="text-sm text-slate-600 dark:text-slate-400">Upload Product Photo</p>
                       <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">JPG, PNG strictly under 5MB</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Platform</label>
                    <select value={photoForm.contentType} onChange={e => setPhotoForm({...photoForm, contentType: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 outline-none text-xs">
                      <option>TikTok Affiliate</option>
                      <option>IG Story</option>
                      <option>Ads Script</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Target Age</label>
                    <select value={photoForm.targetAge} onChange={e => setPhotoForm({...photoForm, targetAge: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 outline-none text-xs">
                      <option>Gen Z</option>
                      <option>Millennials</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={generateScriptsFromPhoto} disabled={photoProcessing || !photoForm.imageData}
                  className="w-full py-5 rounded-2xl bg-pink-600 text-white font-black text-sm tracking-widest hover:bg-pink-500 transition-all shadow-xl shadow-pink-600/20 flex items-center justify-center gap-3"
                >
                  {photoProcessing ? <Activity size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  ANALYZE PHOTO
                </button>
             </div>

             <div className="lg:col-span-7">
                {generatedPhotoScripts.length > 0 ? (
                  <div className="grid gap-6">
                    {generatedPhotoScripts.map((script, idx) => (
                      <motion.div key={idx} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-pink-500/10">
                         <div className="flex justify-between items-center mb-6">
                           <span className="text-[10px] font-black px-3 py-1 bg-pink-600 text-white rounded-full">AI ANALYSIS #{idx + 1}</span>
                         </div>
                         <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-light mb-8 italic">"{script}"</p>
                         <button 
                           onClick={() => { setText(script); setCurrentView('tts'); }}
                           className="w-full py-4 rounded-2xl border-2 border-pink-600 text-pink-600 dark:text-pink-400 hover:bg-pink-600 hover:text-white font-black text-xs transition-all flex items-center justify-center gap-3"
                         >
                           USE THIS ANALYSIS <ArrowRight size={18} />
                         </button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] opacity-30 text-center">
                    <Camera size={64} className="mb-4" />
                    <h3 className="text-xl font-bold">Upload to Analyze</h3>
                    <p className="text-sm mt-2 max-w-xs">AI akan menganalisa elemen visual pada foto untuk membuat script yang akurat.</p>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>

      {/* FLOATING AUDIO TOOLBAR */}
      <AnimatePresence>
        {previewState.playingVoiceId && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-[100]"
          >
            <div className="bg-slate-900/90 dark:bg-indigo-950/90 backdrop-blur-2xl rounded-full p-3 pl-6 pr-4 border border-white/10 shadow-2xl flex items-center justify-between text-white">
               <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
                    <div className="relative w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                      <Volume2 size={20} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black tracking-widest text-white/50 uppercase">Previewing</div>
                    <div className="text-sm font-bold truncate max-w-[120px]">{VOICE_OPTIONS.find(v => v.id === previewState.playingVoiceId)?.name}</div>
                  </div>
               </div>
               <div className="flex gap-1 h-4 items-center">
                  {[0.1, 0.4, 0.2, 0.5, 0.3].map((d, i) => (
                    <motion.div 
                       key={i} animate={{ height: [4, 16, 4] }} transition={{ duration: 0.5, repeat: Infinity, delay: d }}
                       className="w-1 bg-indigo-500 rounded-full"
                    />
                  ))}
               </div>
               <button onClick={stopPreview} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                 <StopCircle size={22} className="text-white" />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
