import { useState, useRef, useCallback } from "react";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export type VoiceStatus =
  | "idle"
  | "recording"
  | "transcribing"
  | "speaking"
  | "error";

export interface UseVoiceReturn {
  status: VoiceStatus;
  error: string | null;
  /** Start microphone recording (push-to-talk on). */
  startRecording: () => Promise<void>;
  /** Stop recording, send to Deepgram STT, return transcript. */
  stopRecording: () => Promise<string>;
  /** Speak text via Deepgram TTS. Resolves when audio finishes. */
  speak: (text: string, voice?: string) => Promise<void>;
  /** Immediately stop any in-progress TTS playback. */
  cancelSpeak: () => void;
  /** True while the browser mic is open. */
  isRecording: boolean;
}

export function useVoice(): UseVoiceReturn {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error,  setError]  = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef  = useRef<string | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const clearError = () => setError(null);

  function revokeAudioUrl() {
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
  }

  // ── Recording ──────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    clearError();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick a MIME type the browser + Deepgram both understand
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg;codecs=opus";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(250); // collect chunks every 250 ms
      mediaRecorderRef.current = recorder;
      setStatus("recording");
    } catch (err: any) {
      setError(err.message ?? "Microphone access denied");
      setStatus("error");
    }
  }, []);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve("");
        return;
      }

      setStatus("transcribing");

      recorder.onstop = async () => {
        // Stop all mic tracks
        recorder.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current = null;

        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size < 100) {
          setStatus("idle");
          resolve("");
          return;
        }

        try {
          const res = await fetch(`${base}/api/deepgram/transcribe`, {
            method: "POST",
            headers: { "Content-Type": mimeType },
            credentials: "include",
            body: blob,
          });

          if (!res.ok) {
            const msg = (await res.json().catch(() => ({ error: res.statusText }))).error;
            throw new Error(msg);
          }

          const { transcript } = await res.json();
          setStatus("idle");
          resolve(transcript ?? "");
        } catch (err: any) {
          setError(err.message ?? "Transcription failed");
          setStatus("error");
          reject(err);
        }
      };

      recorder.stop();
    });
  }, []);

  // ── Text-to-speech ─────────────────────────────────────────────────────────

  const cancelSpeak = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    revokeAudioUrl();
    // Only reset if we were actually speaking
    setStatus((s) => (s === "speaking" ? "idle" : s));
  }, []);

  const speak = useCallback(
    async (text: string, voice = "aura-asteria-en"): Promise<void> => {
      if (!text.trim()) return;

      cancelSpeak();
      clearError();
      setStatus("speaking");

      try {
        const res = await fetch(`${base}/api/deepgram/speak`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text, voice }),
        });

        if (!res.ok) {
          const msg = (await res.json().catch(() => ({ error: res.statusText }))).error;
          throw new Error(msg);
        }

        const audioBlob = await res.blob();
        const url = URL.createObjectURL(audioBlob);
        audioBlobUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => { revokeAudioUrl(); resolve(); };
          audio.onerror = () => { revokeAudioUrl(); reject(new Error("Audio playback error")); };
          audio.play().catch(reject);
        });

        setStatus("idle");
      } catch (err: any) {
        revokeAudioUrl();
        setError(err.message ?? "Speech failed");
        setStatus("error");
      }
    },
    [cancelSpeak]
  );

  return {
    status,
    error,
    startRecording,
    stopRecording,
    speak,
    cancelSpeak,
    isRecording: status === "recording",
  };
}
