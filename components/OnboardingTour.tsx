import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Compass, Sparkles, X } from 'lucide-react';

export const ONBOARDING_STORAGE_KEY = 'amzpulse_onboarded';

interface TourStep {
  target: string; // matches a data-tour="<target>" attribute in the app
  title: string;
  body: string;
}

// Each target must already exist in the DOM while the dashboard view is active — a step
// whose element isn't found is skipped rather than shown centered/orphaned.
const STEPS: TourStep[] = [
  { target: 'tour-search', title: 'Search any product', body: 'Paste an Amazon ASIN, title, or brand here to pull live product data into your workspace.' },
  { target: 'tour-trending', title: "See what's moving", body: 'Trending Now and All-Time Best Sellers surface real ranked products, so there is always somewhere to start.' },
  { target: 'tour-watchlist', title: 'Save what you like', body: 'Click the heart on any product card to save it here and come back to it later.' },
  { target: 'tour-batch', title: 'Scale your research', body: 'Owner and admin seats can analyze many ASINs at once from Batch Analysis.' },
  { target: 'tour-referrals', title: 'Invite your team', body: 'Share your invite link from Referrals and earn rewards as your team joins.' }
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [stepIndex, setStepIndex] = useState(-1); // -1 = welcome card
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isOpen) setStepIndex(-1);
  }, [isOpen]);

  const recalc = useCallback(() => {
    if (stepIndex < 0 || stepIndex >= STEPS.length) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${STEPS[stepIndex].target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    setRect(el.getBoundingClientRect());
  }, [stepIndex]);

  // Scroll the target into view on step change, then measure once the scroll settles —
  // recalc() alone would otherwise measure wherever the element already happened to be,
  // which is frequently off-screen for anything below the fold.
  useEffect(() => {
    if (stepIndex < 0 || stepIndex >= STEPS.length) return;
    const el = document.querySelector(`[data-tour="${STEPS[stepIndex].target}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'auto' });
    const id = requestAnimationFrame(recalc);
    return () => cancelAnimationFrame(id);
  }, [stepIndex, recalc]);

  useEffect(() => {
    recalc();
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [recalc]);

  if (!isOpen) return null;

  const finish = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    onClose();
  };

  const next = () => {
    if (stepIndex >= STEPS.length - 1) {
      finish();
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const back = () => setStepIndex((current) => Math.max(0, current - 1));

  if (stepIndex === -1) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 inline-flex rounded-full bg-amz-accent/15 p-3 text-amz-accent">
            <Compass size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Welcome to AmzPulse</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            A quick five-step tour: search, trending signals, watchlists, batch research, and referrals.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => setStepIndex(0)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-amz-accent px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-orange-500"
            >
              <Sparkles size={16} /> Start the tour
            </button>
            <button onClick={finish} className="text-xs text-slate-500 transition hover:text-slate-300">
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const step = STEPS[stepIndex];
  const calloutWidth = 320;
  const calloutTop = rect ? Math.min(rect.bottom + 12, window.innerHeight - 200) : window.innerHeight / 2 - 90;
  const calloutLeft = rect
    ? Math.min(Math.max(rect.left, 16), window.innerWidth - calloutWidth - 16)
    : window.innerWidth / 2 - calloutWidth / 2;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/75" onClick={finish} />

      {rect && (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-amz-accent transition-all duration-200"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}

      <div
        className="absolute rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl transition-all duration-200"
        style={{ top: calloutTop, left: calloutLeft, width: calloutWidth }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs font-bold uppercase tracking-wide text-amz-accent">
            Step {stepIndex + 1} of {STEPS.length}
          </div>
          <button onClick={finish} className="text-slate-500 transition hover:text-white" aria-label="Close tour">
            <X size={16} />
          </button>
        </div>
        <h3 className="mt-2 text-base font-bold text-white">{step.title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-400">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={back}
            disabled={stepIndex === 0}
            className="text-xs font-medium text-slate-500 transition hover:text-slate-300 disabled:opacity-0"
          >
            Back
          </button>
          <button
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-full bg-amz-accent px-3.5 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-orange-500"
          >
            {stepIndex === STEPS.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
