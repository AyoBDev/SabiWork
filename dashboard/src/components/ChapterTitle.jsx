'use client';

import { useState, useEffect, useRef } from 'react';

const CHAPTER_MAP = [
  {
    id: 'chapter-1',
    match: (event) => event?.actor === 'Mama Chioma',
    title: 'Chapter 1: The Sale',
  },
  {
    id: 'chapter-2',
    match: (event) => event?.event_type === 'supplier_matched',
    title: 'Chapter 2: The Supply Chain',
  },
  {
    id: 'chapter-3',
    match: (event) => event?.event_type === 'investment_round_opened',
    title: 'Chapter 3: The Investment',
  },
  {
    id: 'chapter-4',
    match: (event) =>
      event?.actor?.includes('Adamu') && event?.event_type === 'job_matched',
    title: 'Chapter 4: The Worker',
  },
  {
    id: 'chapter-5',
    match: (event) => event?.event_type === 'verification_granted',
    title: 'Chapter 5: Trust Earned',
  },
  {
    id: 'finale',
    match: (event) => event?.event_type === 'platform_summary',
    title: 'The SabiWork Effect',
  },
];

export default function ChapterTitle({ event }) {
  const [currentChapter, setCurrentChapter] = useState(null);
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(new Set());
  const timerRef = useRef(null);

  useEffect(() => {
    if (!event) return;

    const matched = CHAPTER_MAP.find(
      (ch) => !shownRef.current.has(ch.id) && ch.match(event)
    );

    if (!matched) return;

    shownRef.current.add(matched.id);
    setCurrentChapter(matched);
    setVisible(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = setTimeout(() => {
        setCurrentChapter(null);
      }, 700);
    }, 2500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [event]);

  if (!currentChapter) return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-700 ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      <div className="text-center">
        <h1
          className="text-2xl font-bold text-white"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.5)' }}
        >
          {currentChapter.title}
        </h1>
        {currentChapter.id !== 'finale' && (
          <p
            className="mt-2 text-sm text-white/70"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
          >
            A new chapter begins
          </p>
        )}
      </div>
    </div>
  );
}
