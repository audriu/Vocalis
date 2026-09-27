import { Gauge, Sparkles, Activity, BookOpen } from "lucide-react";
import { Card } from "@/components/ui";
import type { PacingInsight } from "@/services/smart-rewrite";

export function CadenceInsights({
  pacing,
  cleanlinessScore,
  lexicalDiversity,
  signpostCount,
}: {
  pacing: PacingInsight;
  cleanlinessScore: number;
  lexicalDiversity: number;
  signpostCount: number;
}) {
  return (
    <Card className="cadence-card">
      <div className="cadence-header">
        <h3 className="feedback-title" style={{ marginBottom: 0 }}>
          <Activity size={18} />
          Delivery & Rhythm Intelligence
        </h3>
        <span className="cadence-status-pill">{pacing.label}</span>
      </div>

      <p className="muted-note" style={{ marginTop: 6, marginBottom: 18 }}>
        {pacing.advice}
      </p>

      <div className="cadence-grid">
        <div className="cadence-metric">
          <div className="cadence-metric-top">
            <Gauge size={14} />
            <span>Speaking Pace</span>
          </div>
          <strong>{pacing.wpm} WPM</strong>
          <small>Target: 115–160 WPM</small>
          <div className="cadence-progress-bar">
            <div
              className={`cadence-fill ${
                pacing.status === "optimal"
                  ? "fill-green"
                  : pacing.status === "fast"
                    ? "fill-orange"
                    : "fill-blue"
              }`}
              style={{
                width: `${Math.min(100, Math.max(10, (pacing.wpm / 200) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="cadence-metric">
          <div className="cadence-metric-top">
            <Sparkles size={14} />
            <span>Speech Cleanliness</span>
          </div>
          <strong>{cleanlinessScore}%</strong>
          <small>{cleanlinessScore >= 90 ? "Minimal verbal fillers" : "Replace fillers with breath"}</small>
          <div className="cadence-progress-bar">
            <div
              className="cadence-fill fill-green"
              style={{ width: `${cleanlinessScore}%` }}
            />
          </div>
        </div>

        <div className="cadence-metric">
          <div className="cadence-metric-top">
            <BookOpen size={14} />
            <span>Vocabulary Variety</span>
          </div>
          <strong>{lexicalDiversity}%</strong>
          <small>Unique word diversity</small>
          <div className="cadence-progress-bar">
            <div
              className="cadence-fill fill-purple"
              style={{ width: `${Math.min(100, lexicalDiversity)}%` }}
            />
          </div>
        </div>

        <div className="cadence-metric">
          <div className="cadence-metric-top">
            <Activity size={14} />
            <span>Signpost Density</span>
          </div>
          <strong>{signpostCount} cues</strong>
          <small>{signpostCount >= 2 ? "Clear logic signposts" : "Add transition words"}</small>
          <div className="cadence-progress-bar">
            <div
              className="cadence-fill fill-orange"
              style={{ width: `${Math.min(100, (signpostCount / 4) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
