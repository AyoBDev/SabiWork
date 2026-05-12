'use client'

import { useEffect, useState, useRef } from 'react'
import { Terminal } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const REASONING_TEMPLATES = {
  sale_logged: [
    'Parsing WhatsApp message...',
    'Detected: sale transaction',
    'Validating amount: \u20A6{amount}',
    'Updating trader ledger \u2713',
    'SabiScore +2 applied',
  ],
  payment_received: [
    'Payment webhook received',
    'Verifying Paystack signature...',
    'Amount confirmed: \u20A6{amount}',
    'Matching to pending invoice \u2713',
    'Releasing escrow funds',
  ],
  job_matched: [
    'Scanning worker pool...',
    'Filtering by: skill, proximity, score',
    'Match found: {actor} (score: {score})',
    'Sending job notification \u2713',
  ],
  worker_onboarded: [
    'New worker registration',
    'Verifying identity documents...',
    'Skills assessment: complete',
    'Initial SabiScore: 40',
    'Worker activated \u2713',
  ],
  payout_sent: [
    'Processing payout...',
    'Calculating platform fee (2.5%)',
    'Net amount: \u20A6{amount}',
    'Disbursing via Paystack \u2713',
    'Receipt sent to worker',
  ],
  score_updated: [
    'Recalculating SabiScore...',
    'Factors: payment history, job completion, tenure',
    'New score: {score}',
    'Threshold check: credit unlocked \u2713',
  ],
  investment_joined: [
    'Investment round detected',
    'Validating investor eligibility...',
    'Amount: \u20A6{amount}',
    'Round progress: 67% funded',
    'Confirmation sent \u2713',
  ],
  default: [
    'Processing event...',
    'Validating payload...',
    'Action completed \u2713',
  ],
}

function interpolate(template, event) {
  const amount = event?.metadata?.amount ?? '0'
  const actor = event?.actor ?? 'Unknown'
  const score = event?.metadata?.score ?? '50'

  return template
    .replace('{amount}', Number(amount).toLocaleString())
    .replace('{actor}', actor)
    .replace('{score}', score)
}

export default function AgentThinking({ event }) {
  const [lines, setLines] = useState([])
  const [currentText, setCurrentText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const containerRef = useRef(null)
  const animationRef = useRef(null)
  const eventIdRef = useRef(null)

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [lines, currentText])

  useEffect(() => {
    if (!event) return

    // Prevent re-processing the same event
    const eventId = JSON.stringify(event)
    if (eventId === eventIdRef.current) return
    eventIdRef.current = eventId

    // Cancel any ongoing animation
    if (animationRef.current) {
      clearTimeout(animationRef.current)
      animationRef.current = null
    }

    const templates =
      REASONING_TEMPLATES[event.event_type] || REASONING_TEMPLATES.default
    const resolvedLines = templates.map((t) => interpolate(t, event))

    // Reset state for new event
    setLines([])
    setCurrentText('')

    let lineIndex = 0
    let charIndex = 0
    let completedLines = []

    function typeNextChar() {
      if (lineIndex >= resolvedLines.length) {
        // All lines done
        animationRef.current = null
        return
      }

      const currentLine = resolvedLines[lineIndex]

      if (charIndex <= currentLine.length) {
        setCurrentText(currentLine.slice(0, charIndex))
        charIndex++
        animationRef.current = setTimeout(typeNextChar, 30)
      } else {
        // Line complete, push to completed lines
        completedLines = [...completedLines, currentLine]
        // Keep only last 5 lines visible
        const visible = completedLines.slice(-5)
        setLines(visible)
        setCurrentText('')
        lineIndex++
        charIndex = 0

        if (lineIndex < resolvedLines.length) {
          // Pause before next line
          animationRef.current = setTimeout(typeNextChar, 200)
        } else {
          animationRef.current = null
        }
      }
    }

    // Start typing after a brief delay
    animationRef.current = setTimeout(typeNextChar, 100)

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current)
        animationRef.current = null
      }
    }
  }, [event])

  return (
    <Card className="border-0 bg-gray-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-green-400">
          <Terminal className="h-4 w-4" />
          Agent Reasoning
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="font-mono text-sm text-green-400 bg-gray-950 rounded-md p-3 min-h-[140px] max-h-[180px] overflow-y-auto"
        >
          {lines.map((line, i) => (
            <div key={i} className="leading-relaxed">
              <span className="text-green-600 mr-1">&gt;</span>
              {line}
            </div>
          ))}
          {currentText !== '' && (
            <div className="leading-relaxed">
              <span className="text-green-600 mr-1">&gt;</span>
              {currentText}
              <span
                className={`inline-block w-[7px] h-[14px] bg-green-400 ml-[1px] align-middle ${
                  showCursor ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          )}
          {currentText === '' && lines.length === 0 && (
            <div className="leading-relaxed text-green-600/50">
              <span className="mr-1">&gt;</span>
              Awaiting events...
              <span
                className={`inline-block w-[7px] h-[14px] bg-green-400 ml-[1px] align-middle ${
                  showCursor ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
