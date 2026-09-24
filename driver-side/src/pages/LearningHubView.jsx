import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap, PlayCircle, Video, UserCheck, CheckCircle2, Clock,
  ArrowLeft, ArrowRight, Trophy, RotateCcw, Sparkles,
} from 'lucide-react';
import { getTrainingModules, completeTrainingModule } from '../api';
import { MODULE_CONTENT, PASS_MARK } from '../data/learningContent';
import { getLogs, logEvent, LOG_CATEGORIES, LOG_SEVERITY } from '../services/logger';

const TYPE_ICON = { simulation: PlayCircle, video: Video, instructor: UserCheck };
const SEVERITY_STYLE = {
  critical: 'bg-red-50 text-red-600 border-red-500/40',
  high: 'bg-orange-50 text-orange-600 border-orange-500/40',
  medium: 'bg-amber-50 text-amber-600 border-amber-500/40',
  low: 'bg-[#f0f0ec] text-neutral-600 border-[#e6e6e1]',
};

// Session events that should surface a module at the top of the hub.
function sessionRecommendations() {
  const rec = {};
  for (const l of getLogs()) {
    if (l.severity === LOG_SEVERITY.INFO) continue;
    if (l.category === LOG_CATEGORIES.FUEL) rec.m3 = 'Fuel warning during this shift';
    if (l.category === LOG_CATEGORIES.SAFETY) rec.m1 = 'Proximity/safety alert during this shift';
  }
  return rec;
}

export default function LearningHubView({ operatorId = 'OP001', operatorName = 'Operator' }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // module being studied
  const recs = useMemo(sessionRecommendations, []);

  const load = () => getTrainingModules(operatorId).then(m => { setModules(m); setLoading(false); });
  useEffect(() => { load(); }, [operatorId]);

  const sorted = useMemo(
    () => [...modules].sort((a, b) => (recs[b.id] ? 1 : 0) - (recs[a.id] ? 1 : 0) || (a.completed ? 1 : 0) - (b.completed ? 1 : 0)),
    [modules, recs]
  );
  const done = modules.filter(m => m.completed).length;
  const pct = modules.length ? Math.round((done / modules.length) * 100) : 0;
  const totalMin = modules.filter(m => !m.completed).reduce((s, m) => s + m.duration_min, 0);

  if (active) {
    return (
      <ModulePlayer
        module={active}
        onExit={() => { setActive(null); load(); }}
        onFinish={async (score) => {
          if (score >= PASS_MARK) {
            await completeTrainingModule(operatorId, active.id, score);
            logEvent(LOG_CATEGORIES.TASK, `Training completed: ${active.title} (${score}%)`, LOG_SEVERITY.INFO);
          }
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e6e6e1] gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <GraduationCap size={18} className="text-neutral-900" />
            <h1 className="text-xl font-black text-neutral-900 uppercase tracking-tight">Learning Hub</h1>
          </div>
          <span className="text-xs text-neutral-600 font-mono">{operatorName} · CAT 320 OPERATOR CERTIFICATION</span>
        </div>
        <div className="flex items-center gap-4 bg-[#ffffff] border border-[#e6e6e1] rounded-xl px-4 py-2.5">
          <div className="w-40">
            <div className="flex justify-between text-[10px] font-mono text-neutral-600 mb-1">
              <span>{done}/{modules.length} COMPLETE</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-[#f0f0ec] rounded-full overflow-hidden">
              <div className="h-full bg-[#FFCD11] transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">{totalMin} MIN LEFT</span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500 font-mono">Loading modules…</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map(m => {
            const Icon = TYPE_ICON[m.type] || PlayCircle;
            const hasContent = !!MODULE_CONTENT[m.id];
            return (
              <div key={m.id} className={`bg-[#ffffff] border rounded-2xl p-4 flex flex-col gap-3 ${recs[m.id] && !m.completed ? 'border-[#FFCD11]/60' : 'border-[#e6e6e1]'}`}>
                {recs[m.id] && !m.completed && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-900">
                    <Sparkles size={12} /> RECOMMENDED — {recs[m.id].toUpperCase()}
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#FFCD11]/10 text-neutral-900 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} />
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${SEVERITY_STYLE[m.severity] || SEVERITY_STYLE.low}`}>
                    {m.severity}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-neutral-900">{m.title}</h3>
                  <p className="text-xs text-neutral-600 mt-1">{m.reason}</p>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono">
                    <Clock size={12} /> {m.duration_min} min · {m.type}
                  </span>
                  {m.completed ? (
                    <button type="button" onClick={() => setActive(m)} className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700">
                      <CheckCircle2 size={14} /> {m.score}% · Review
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!hasContent}
                      onClick={() => setActive(m)}
                      className="bg-neutral-900 hover:bg-black disabled:opacity-40 text-white text-xs font-black px-3 py-1.5 rounded-lg active:scale-95 transition"
                    >
                      START
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModulePlayer({ module, onExit, onFinish }) {
  const content = MODULE_CONTENT[module.id];
  const steps = content.lessons.length;
  const [step, setStep] = useState(0); // 0..steps-1 lessons, steps = quiz, steps+1 = result
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);

  const submit = () => {
    const correct = content.quiz.filter((q, i) => answers[i] === q.answer).length;
    const s = Math.round((correct / content.quiz.length) * 100);
    setScore(s);
    setStep(steps + 1);
    onFinish(s);
  };
  const retry = () => { setAnswers({}); setScore(null); setStep(0); };
  const allAnswered = content.quiz.every((_, i) => answers[i] !== undefined);
  const progress = ((Math.min(step, steps + 1)) / (steps + 1)) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button type="button" onClick={onExit} className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-bold">
        <ArrowLeft size={14} /> BACK TO LEARNING HUB
      </button>
      <div>
        <h1 className="text-xl font-black text-neutral-900">{module.title}</h1>
        <div className="h-1 bg-[#f0f0ec] rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-[#FFCD11] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step < steps && (
        <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-6 space-y-3">
          <span className="text-[10px] font-mono text-neutral-900">LESSON {step + 1} OF {steps}</span>
          <h2 className="text-lg font-extrabold text-neutral-900">{content.lessons[step].title}</h2>
          <p className="text-sm text-neutral-700 leading-relaxed">{content.lessons[step].body}</p>
          <div className="flex justify-between pt-3">
            <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)} className="text-xs font-bold text-neutral-600 disabled:opacity-30">
              PREVIOUS
            </button>
            <button type="button" onClick={() => setStep(step + 1)} className="flex items-center gap-1.5 bg-neutral-900 text-white text-xs font-black px-4 py-2 rounded-lg">
              {step === steps - 1 ? 'TAKE QUIZ' : 'NEXT'} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {step === steps && (
        <div className="space-y-4">
          {content.quiz.map((q, qi) => (
            <div key={qi} className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-5">
              <p className="text-sm font-bold text-neutral-900 mb-3">{qi + 1}. {q.q}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                    className={`text-left text-xs px-3 py-2.5 rounded-lg border transition ${
                      answers[qi] === oi ? 'bg-[#FFCD11]/15 border-[#FFCD11] text-neutral-900' : 'bg-[#f5f5f2] border-[#e6e6e1] text-neutral-700 hover:border-[#d2d2cb]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={!allAnswered}
            onClick={submit}
            className="bg-neutral-900 disabled:opacity-40 text-white text-xs font-black px-5 py-2.5 rounded-lg"
          >
            SUBMIT ANSWERS
          </button>
        </div>
      )}

      {step === steps + 1 && (
        <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-6 space-y-4 text-center">
          <Trophy size={36} className={`mx-auto ${score >= PASS_MARK ? 'text-neutral-900' : 'text-neutral-400'}`} />
          <h2 className="text-2xl font-black text-neutral-900">{score}%</h2>
          <p className="text-sm text-neutral-600">
            {score >= PASS_MARK ? 'Module passed and saved to your training record.' : `You need ${PASS_MARK}% to pass. Review the lessons and try again.`}
          </p>
          <div className="text-left space-y-1.5">
            {content.quiz.map((q, i) => (
              <p key={i} className={`text-xs ${answers[i] === q.answer ? 'text-emerald-600' : 'text-red-600'}`}>
                {answers[i] === q.answer ? '✓' : '✗'} {q.q}
                {answers[i] !== q.answer && <span className="text-neutral-600"> — Correct: {q.options[q.answer]}</span>}
              </p>
            ))}
          </div>
          <div className="flex justify-center gap-3">
            {score < PASS_MARK && (
              <button type="button" onClick={retry} className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 border border-[#e6e6e1] px-4 py-2 rounded-lg">
                <RotateCcw size={14} /> RETRY
              </button>
            )}
            <button type="button" onClick={onExit} className="bg-neutral-900 text-white text-xs font-black px-4 py-2 rounded-lg">DONE</button>
          </div>
        </div>
      )}
    </div>
  );
}
