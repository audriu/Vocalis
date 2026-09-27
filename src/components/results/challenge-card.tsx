"use client";
import { useState } from "react";
import Link from "next/link";
import { Zap, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui";

export function ChallengeCard({
  steps,
  retryHref,
}: {
  steps: { title: string; instruction: string }[];
  retryHref: string;
}) {
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  const toggle = (idx: number) => {
    setCompleted((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <Card className="challenge-blueprint-card">
      <Eyebrow>NEXT 60-SECOND BLUEPRINT</Eyebrow>
      <div className="challenge-title-row">
        <h3>
          <Zap size={16} />
          Your Action Plan
        </h3>
        <span className="challenge-badge">Instant Rep</span>
      </div>

      <p className="muted-note" style={{ marginTop: 4, marginBottom: 14 }}>
        Check off each micro-habit before recording your next attempt.
      </p>

      <div className="challenge-steps-list">
        {steps.map((step, idx) => {
          const isDone = !!completed[idx];
          return (
            <div
              key={idx}
              className={`challenge-step-item ${isDone ? "done" : ""}`}
              onClick={() => toggle(idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(idx);
                }
              }}
            >
              <span className="step-checkbox">
                {isDone ? (
                  <CheckCircle2 size={16} className="checked-icon" />
                ) : (
                  <Circle size={16} className="unchecked-icon" />
                )}
              </span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.instruction}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Link href={retryHref} className="button button-primary challenge-launch-btn">
        Start Practice with Blueprint <ArrowRight size={14} />
      </Link>
    </Card>
  );
}
