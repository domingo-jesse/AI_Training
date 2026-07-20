import { useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Loader2, AlertCircle } from "lucide-react";
import { type VoiceStatus } from "@/hooks/useVoice";

interface VoiceToolbarProps {
  status: VoiceStatus;
  error: string | null;
  /** Called when the user clicks the mic button to start recording. */
  onStartRecording: () => void;
  /** Called when the user clicks the mic button to stop + transcribe. */
  onStopRecording: () => void;
  /** Called when the user clicks the speaker button. */
  onSpeak: () => void;
  /** Called to cancel TTS playback. */
  onCancelSpeak: () => void;
  /** Whether TTS is available (a `speakText` is provided). */
  canSpeak?: boolean;
  /** Extra className for the wrapper */
  className?: string;
}

export function VoiceToolbar({
  status,
  error,
  onStartRecording,
  onStopRecording,
  onSpeak,
  onCancelSpeak,
  canSpeak = true,
  className = "",
}: VoiceToolbarProps) {
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const displayRef = useRef<HTMLSpanElement>(null);

  // Recording timer
  useEffect(() => {
    if (status === "recording") {
      secondsRef.current = 0;
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        if (displayRef.current) {
          const m = Math.floor(secondsRef.current / 60).toString().padStart(2, "0");
          const s = (secondsRef.current % 60).toString().padStart(2, "0");
          displayRef.current.textContent = `${m}:${s}`;
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      secondsRef.current = 0;
      if (displayRef.current) displayRef.current.textContent = "";
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const isRecording     = status === "recording";
  const isTranscribing  = status === "transcribing";
  const isSpeaking      = status === "speaking";
  const isBusy          = isTranscribing || isSpeaking;

  const handleMicClick = () => {
    if (isRecording)         onStopRecording();
    else if (!isBusy)        onStartRecording();
  };

  const handleSpeakerClick = () => {
    if (isSpeaking) onCancelSpeak();
    else if (!isBusy && canSpeak) onSpeak();
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* ── Mic button ── */}
      <div className="relative">
        <button
          type="button"
          onClick={handleMicClick}
          disabled={isTranscribing || isSpeaking}
          title={isRecording ? "Stop recording" : "Start recording (push-to-talk)"}
          className={[
            "relative flex items-center justify-center w-10 h-10 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isRecording
              ? "bg-red-500 text-white shadow-lg shadow-red-500/40"
              : isTranscribing
              ? "bg-primary/20 text-primary cursor-wait"
              : isSpeaking
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary/10 hover:bg-primary/20 text-primary",
          ].join(" ")}
        >
          {isTranscribing
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : isRecording
            ? <MicOff className="w-4 h-4" />
            : <Mic className="w-4 h-4" />}

          {/* Pulsing ring while recording */}
          {isRecording && (
            <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-60 pointer-events-none" />
          )}
        </button>
      </div>

      {/* ── Status label ── */}
      <div className="flex-1 min-w-0">
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-xs text-red-400 font-medium">Recording</span>
            <span ref={displayRef} className="text-xs font-mono text-red-400/70" />
          </div>
        )}
        {isTranscribing && (
          <span className="text-xs text-primary animate-pulse">Transcribing…</span>
        )}
        {isSpeaking && (
          <div className="flex items-center gap-1.5">
            <WaveIcon />
            <span className="text-xs text-blue-400">Speaking…</span>
          </div>
        )}
        {status === "idle" && !error && (
          <span className="text-xs text-muted-foreground">
            {canSpeak ? "Click mic to speak or press speaker to hear the question" : "Click mic to speak your answer"}
          </span>
        )}
        {status === "error" && error && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
      </div>

      {/* ── Speaker button ── */}
      {canSpeak && (
        <button
          type="button"
          onClick={handleSpeakerClick}
          disabled={isRecording || isTranscribing}
          title={isSpeaking ? "Stop playback" : "Hear the question read aloud"}
          className={[
            "flex items-center justify-center w-10 h-10 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isSpeaking
              ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              : isRecording || isTranscribing
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

/** Tiny animated audio wave icon */
function WaveIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" className="text-blue-400" fill="currentColor">
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={i * 3.2}
          y={0}
          width={2}
          height={12}
          rx={1}
          style={{
            transformOrigin: `${i * 3.2 + 1}px 6px`,
            animation: `wave-bar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave-bar {
          from { transform: scaleY(0.2); opacity: 0.4; }
          to   { transform: scaleY(1);   opacity: 1; }
        }
      `}</style>
    </svg>
  );
}
