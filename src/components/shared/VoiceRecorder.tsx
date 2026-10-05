import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Square, Play, Pause, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';

interface VoiceRecorderProps {
  userId: string;
  audioUrl: string | null;
  onAudioChange: (url: string | null) => void;
}

type RecState = 'idle' | 'requesting' | 'recording' | 'denied';

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function WaveformBars() {
  return (
    <div className="flex items-center gap-[3px] h-6">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-danger-400"
          style={{
            animation: `waveform 0.8s ease-in-out ${i * 0.05}s infinite alternate`,
            height: `${8 + Math.random() * 16}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes waveform {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

export function VoiceRecorder({ userId, audioUrl, onAudioChange }: VoiceRecorderProps) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { showToast } = useToast();

  const [recState, setRecState] = useState<RecState>('idle');
  const [playing, setPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startRecording = useCallback(async () => {
    setRecState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setLocalBlobUrl(url);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      setRecState('recording');
    } catch (err) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setRecState('denied');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setRecState('idle');
        showToast(isEs ? 'No se detectó ningún micrófono en tu dispositivo' : 'No microphone detected on your device', 'error');
      } else {
        setRecState('idle');
        showToast(isEs ? 'No se pudo acceder al micrófono' : 'Could not access microphone', 'error');
      }
    }
  }, [isEs, showToast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecState('idle');
  }, []);

  const togglePlayback = useCallback(() => {
    const src = audioUrl || localBlobUrl;
    if (!src) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.src = src;
      audioRef.current.play();
      setPlaying(true);
    }
  }, [audioUrl, localBlobUrl, playing]);

  const uploadAudio = useCallback(async () => {
    if (!localBlobUrl) return;
    setUploading(true);
    try {
      const resp = await fetch(localBlobUrl);
      const blob = await resp.blob();
      const path = `${userId}/${Date.now()}.webm`;
      const { error } = await supabase.storage.from('job-audio-notes').upload(path, blob, {
        contentType: 'audio/webm',
        upsert: false,
      });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('job-audio-notes').getPublicUrl(path);
      onAudioChange(data.publicUrl);
      setLocalBlobUrl(null);
      showToast(isEs ? 'Audio subido correctamente' : 'Audio uploaded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    }
    setUploading(false);
  }, [localBlobUrl, userId, onAudioChange, isEs, showToast]);

  const deleteAudio = useCallback(() => {
    onAudioChange(null);
    setLocalBlobUrl(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  }, [onAudioChange]);

  const hasAudio = !!audioUrl || !!localBlobUrl;

  return (
    <div>
      <label className="label">{isEs ? 'Nota de Voz' : 'Voice Note'} <span className="text-xs text-ink-400">({isEs ? 'opcional' : 'optional'})</span></label>
      <div className="rounded-xl border border-ink-200 bg-white p-3">
        {/* Idle */}
        {!hasAudio && recState === 'idle' && (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-3 w-full py-3 px-4 rounded-lg bg-ink-50 hover:bg-pixio-50 text-ink-600 hover:text-pixio-600 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-danger-100 flex items-center justify-center">
              <Mic size={20} className="text-danger-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">{isEs ? 'Grabar nota de voz' : 'Record voice note'}</p>
              <p className="text-xs text-ink-400">{isEs ? 'Explica tu proyecto con audio' : 'Explain your project with audio'}</p>
            </div>
          </button>
        )}

        {/* Requesting permission */}
        {recState === 'requesting' && (
          <div className="flex items-center gap-3 py-3 px-4">
            <div className="w-10 h-10 rounded-full bg-pixio-100 flex items-center justify-center">
              <Loader2 size={20} className="text-pixio-500 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-700">
                {isEs ? 'Concediendo acceso al micrófono...' : 'Granting microphone access...'}
              </p>
              <p className="text-xs text-ink-400">
                {isEs ? 'Acepta el permiso en tu navegador' : 'Accept the permission in your browser'}
              </p>
            </div>
          </div>
        )}

        {/* Permission denied */}
        {recState === 'denied' && (
          <div className="rounded-lg border border-warning-200 bg-warning-50 p-4">
            <div className="flex items-center gap-3 mb-2">
              <MicOff size={20} className="text-warning-500 shrink-0" />
              <p className="text-sm font-medium text-ink-700">
                {isEs ? 'Permiso de micrófono denegado' : 'Microphone permission denied'}
              </p>
            </div>
            <p className="text-xs text-ink-500 mb-3">
              {isEs
                ? 'Por favor activa los permisos de micrófono en la configuración de tu navegador para grabar tu audio.'
                : 'Please enable microphone permissions in your browser settings to record audio.'}
            </p>
            <button
              type="button"
              onClick={startRecording}
              className="px-4 py-2 rounded-lg bg-warning-100 text-warning-700 text-xs font-semibold hover:bg-warning-200 transition-colors"
            >
              {isEs ? 'Intentar de nuevo' : 'Try again'}
            </button>
          </div>
        )}

        {/* Recording with timer + waveform */}
        {recState === 'recording' && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={stopRecording}
              className="w-12 h-12 rounded-full bg-danger-500 flex items-center justify-center text-white hover:bg-danger-600 transition-colors shrink-0 shadow-lg shadow-danger-500/30">
              <Square size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-danger-600">{isEs ? 'Grabando' : 'Recording'}</p>
                <span className="text-sm font-mono font-bold text-danger-500 tabular-nums">{formatTimer(elapsed)}</span>
              </div>
              <WaveformBars />
            </div>
          </div>
        )}

        {/* Playback */}
        {hasAudio && recState !== 'recording' && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={togglePlayback}
              className="w-10 h-10 rounded-full bg-pixio-100 flex items-center justify-center text-pixio-600 hover:bg-pixio-200 transition-colors shrink-0">
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <div className="flex-1 h-8 bg-ink-50 rounded-lg flex items-center px-3">
              <div className="w-full h-1.5 bg-ink-200 rounded-full overflow-hidden">
                <div className={`h-full bg-pixio-500 rounded-full ${playing ? 'animate-pulse' : ''}`} style={{ width: playing ? '60%' : '100%' }} />
              </div>
            </div>
            {localBlobUrl && !audioUrl && (
              <button type="button" onClick={uploadAudio} disabled={uploading}
                className="px-3 py-1.5 rounded-lg bg-pixio-500 text-white text-xs font-medium hover:bg-pixio-600 transition-colors shrink-0">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : (isEs ? 'Subir' : 'Upload')}
              </button>
            )}
            {audioUrl && (
              <span className="text-xs text-green-600 font-medium shrink-0">{isEs ? 'Subido' : 'Uploaded'}</span>
            )}
            <button type="button" onClick={deleteAudio}
              className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-danger-500 transition-colors shrink-0">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AudioPlayer({ url }: { url: string }) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <button type="button" onClick={toggle}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pixio-50 border border-pixio-100 hover:bg-pixio-100 transition-colors">
      <div className="w-8 h-8 rounded-full bg-pixio-500 flex items-center justify-center">
        {playing ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white" />}
      </div>
      <span className="text-sm font-medium text-pixio-700">{isEs ? 'Nota de voz del cliente' : "Client's voice note"}</span>
    </button>
  );
}
