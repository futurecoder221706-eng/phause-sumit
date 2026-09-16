import { HeaderUtils } from './HeaderUtils';
import { useCustomizer } from '../../context/CustomizerContext';
import { useEffect, useState } from 'react';

const ICON = {
  burger: (
    <svg
      className="ax-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={24}
      height={24}
      aria-hidden="true"
    >
      <path d="M4 6l16 0" />
      <path d="M4 12l16 0" />
      <path d="M4 18l16 0" />
    </svg>
  ),

  search: (
    <svg
      className="ax-icon ax-search__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={24}
      height={24}
      aria-hidden="true"
    >
      <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
      <path d="M21 21l-6 -6" />
    </svg>
  ),
};

const typingSentences = [
  'Phause is your security awareness platform',
  "Track your team's security awareness",
  'Build a stronger security culture',
  'Stay aware. Stay secure.',
];

export function Header({
  onCommand,
  onCustomizer,
  onNavToggle,
}: {
  onCommand: () => void;
  onCustomizer: () => void;
  onNavToggle: () => void;
}) {
  const c = useCustomizer();

  // Typing animation state
  const [typedText, setTypedText] = useState('');
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentSentence = typingSentences[sentenceIndex];

    let delay: number;

    if (isDeleting) {
      // Faster when deleting
      delay = 50 + Math.random() * 30;
    } else {
      // Natural typing speed
      delay = 70 + Math.random() * 40;
    }

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // =========================
        // TYPE CHARACTER BY CHARACTER
        // =========================
        if (typedText.length < currentSentence.length) {
          setTypedText(
            currentSentence.slice(0, typedText.length + 1)
          );
        } else {
          // =========================
          // SENTENCE COMPLETED
          // WAIT BEFORE DELETING
          // =========================
          setIsDeleting(true);
        }
      } else {
        // =========================
        // DELETE CHARACTER BY CHARACTER
        // =========================
        if (typedText.length > 0) {
          setTypedText(
            currentSentence.slice(0, typedText.length - 1)
          );
        } else {
          // =========================
          // COMPLETELY DELETED
          // MOVE TO NEXT SENTENCE
          // =========================
          setIsDeleting(false);

          setSentenceIndex(
            (prev) => (prev + 1) % typingSentences.length
          );
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, sentenceIndex]);

  return (
    <header className="ax-header" role="banner">

      {/* SIDEBAR TOGGLE */}
      <button
        type="button"
        className="ax-nav-toggle ax-icon-btn"
        onClick={onNavToggle}
        aria-label="Toggle menu"
        aria-expanded={!c.collapsed}
      >
        {ICON.burger}
      </button>

      {/* TYPING TEXT */}
      <div className="ax-typing-wrapper">
        <span className="ax-search__placeholder">
          {typedText}
          <span className="ax-search__cursor">|</span>
        </span>
      </div>

      {/* SPACER */}
      <span className="ax-header__spacer"></span>

      {/* RIGHT UTILITY CLUSTER */}
      <HeaderUtils onCustomizer={onCustomizer} />

    </header>
  );
}

export default Header;