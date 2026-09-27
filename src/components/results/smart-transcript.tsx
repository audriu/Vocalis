"use client";
import { useState, useEffect } from "react";
import {
  FileText,
  Wand2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, Badge } from "@/components/ui";
import { FILLER_PATTERN } from "@/data/fillers";
import type { DetectedEntity } from "@/types";

const SIGNPOST_REGEX =
  /(\b(?:for example|for instance|in my experience|such as|first|firstly|second|secondly|third|thirdly|because|however|therefore|although|furthermore|moreover|in addition|additionally|meanwhile|consequently|ultimately|in conclusion|that is why|to sum up|in the end|as a result)\b)/gi;

type LensMode = "all" | "fillers" | "signposts" | "entities";

export function SmartTranscript({
  rawTranscript,
  polishedTranscript,
  keyChanges,
  entities = [],
  wordsCount,
}: {
  rawTranscript: string;
  polishedTranscript: string;
  keyChanges: string[];
  entities?: DetectedEntity[];
  wordsCount: number;
}) {
  const [activeTab, setActiveTab] = useState<"original" | "polished">("original");
  const [activeLens, setActiveLens] = useState<LensMode>("all");
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Stop speech if tab unmounts or changes
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeech = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(polishedTranscript);
      utterance.rate = 0.95; // optimal executive cadence
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(polishedTranscript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Extract fillers and signposts counts
  const fillerMatches = rawTranscript.match(FILLER_PATTERN) || [];
  const signpostMatches = rawTranscript.match(SIGNPOST_REGEX) || [];

  // Segment the transcript for highlighting
  const renderAnnotatedTranscript = () => {
    // Regex that captures fillers OR signposts
    const combinedRegex =
      /(\b(?:for example|for instance|in my experience|such as|first|firstly|second|secondly|third|thirdly|because|however|therefore|although|furthermore|moreover|in addition|additionally|meanwhile|consequently|ultimately|in conclusion|that is why|to sum up|in the end|as a result|um|umm|uh|uhm|er|erm|hmm|like|basically|actually|you know|sort of|kind of)\b)/gi;

    const parts = rawTranscript.split(combinedRegex);

    return (
      <p className="transcript-text">
        {parts.map((part, i) => {
          const lower = part.toLowerCase();
          const isFiller =
            fillerMatches.some((f) => f.toLowerCase() === lower);
          const isSignpost =
            signpostMatches.some((s) => s.toLowerCase() === lower);

          if (isFiller && (activeLens === "all" || activeLens === "fillers")) {
            return (
              <mark key={i} className="highlight-filler" title="Filler word: consider replacing with a breath">
                {part}
              </mark>
            );
          }

          if (isSignpost && (activeLens === "all" || activeLens === "signposts")) {
            return (
              <mark key={i} className="highlight-signpost" title="Signpost: guides listener logic">
                {part}
              </mark>
            );
          }

          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <Card className="transcript-panel">
      <CardHeader
        action={
          <div className="transcript-mode-switch">
            <button
              className={`mode-btn ${activeTab === "original" ? "active" : ""}`}
              onClick={() => {
                if (isPlaying && typeof window !== "undefined") {
                  window.speechSynthesis.cancel();
                  setIsPlaying(false);
                }
                setActiveTab("original");
              }}
            >
              <FileText size={13} />
              Your Take
            </button>
            <button
              className={`mode-btn ${activeTab === "polished" ? "active" : ""}`}
              onClick={() => setActiveTab("polished")}
            >
              <Wand2 size={13} />
              AI Polished Delivery ✨
            </button>
          </div>
        }
      >
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={16} />
            {activeTab === "original" ? "Speech Transcript & Lens" : "AI Polished Ideal Take"}
          </h2>
          <p>
            {activeTab === "original"
              ? "Filter patterns to inspect filler density, signposts, and vocabulary in context."
              : "An executive-grade rewrite preserving your authentic ideas while removing friction."}
          </p>
        </div>
      </CardHeader>

      {activeTab === "original" ? (
        <>
          <div className="lens-filters-bar">
            <span className="lens-label">
              <Layers size={13} />
              Lens:
            </span>
            <button
              className={`lens-pill ${activeLens === "all" ? "active" : ""}`}
              onClick={() => setActiveLens("all")}
            >
              All Highlights
            </button>
            <button
              className={`lens-pill ${activeLens === "fillers" ? "active" : ""}`}
              onClick={() => setActiveLens("fillers")}
            >
              Fillers ({fillerMatches.length})
            </button>
            <button
              className={`lens-pill ${activeLens === "signposts" ? "active" : ""}`}
              onClick={() => setActiveLens("signposts")}
            >
              Signposts ({signpostMatches.length})
            </button>
            <button
              className={`lens-pill ${activeLens === "entities" ? "active" : ""}`}
              onClick={() => setActiveLens("entities")}
            >
              Key Terms ({entities.length})
            </button>
          </div>

          {renderAnnotatedTranscript()}

          {entities.length > 0 && (activeLens === "all" || activeLens === "entities") && (
            <div className="entity-list">
              <strong>Names & terms we heard</strong>
              <ul>
                {entities.map((e) => (
                  <li key={`${e.type}-${e.text}`}>
                    <span>{e.type.replace(/_/g, " ")}</span>
                    {e.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="transcript-legend">
            <span>
              <i className="legend-dot orange" />
              Filler word · swap for deliberate pause
            </span>
            <span>
              <i className="legend-dot green" />
              Signpost · guides listener progression
            </span>
            <span style={{ marginLeft: "auto" }}>{wordsCount} words captured</span>
          </div>
        </>
      ) : (
        <div className="polished-container">
          <div className="polished-controls">
            <button
              className={`button button-secondary polished-audio-btn ${isPlaying ? "playing" : ""}`}
              onClick={toggleSpeech}
            >
              {isPlaying ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {isPlaying ? "Pause AI Voice" : "Listen to Ideal Take"}
            </button>
            <button
              className="button button-secondary copy-btn"
              onClick={handleCopy}
              title="Copy polished script"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy Script"}
            </button>
          </div>

          <div className="polished-text-box">
            <p className="polished-text">{polishedTranscript}</p>
          </div>

          <div className="transformations-box">
            <h4>
              <Sparkles size={14} />
              Key Transformations Applied:
            </h4>
            <ul>
              {keyChanges.map((change, i) => (
                <li key={i}>
                  <Check size={13} />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
