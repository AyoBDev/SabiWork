'use client'

import { useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const SPEEDS = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
]

const SCENARIOS = [
  "Mama Chioma's Day",
  'Market Day',
  'Buyer & Worker',
  'Full Demo',
]

export default function DemoControls({ onTrigger, onReset, onSpeedChange }) {
  const [paused, setPaused] = useState(false)
  const [activeSpeed, setActiveSpeed] = useState(1)

  function handlePauseResume() {
    if (paused) {
      setPaused(false)
      onSpeedChange(activeSpeed)
    } else {
      setPaused(true)
      onSpeedChange(0)
    }
  }

  function handleSpeedSelect(value) {
    setActiveSpeed(value)
    setPaused(false)
    onSpeedChange(value)
  }

  function handleScenarioChange(e) {
    const scenario = e.target.value
    if (scenario) {
      onTrigger(scenario)
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      {/* Pause / Resume */}
      <button
        onClick={handlePauseResume}
        className="inline-flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-xs text-foreground hover:bg-muted transition-colors"
        aria-label={paused ? 'Resume' : 'Pause'}
      >
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      </button>

      {/* Speed selector */}
      <div className="flex items-center gap-1">
        {SPEEDS.map(({ label, value }) => (
          <Badge
            key={value}
            variant={activeSpeed === value && !paused ? 'default' : 'outline'}
            className="cursor-pointer select-none px-1.5 py-0.5 text-xs"
            onClick={() => handleSpeedSelect(value)}
          >
            {label}
          </Badge>
        ))}
      </div>

      {/* Scenario dropdown */}
      <select
        onChange={handleScenarioChange}
        defaultValue=""
        className="h-6 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="" disabled>
          Scenario...
        </option>
        {SCENARIOS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Reset button */}
      <button
        onClick={onReset}
        className="inline-flex items-center justify-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 p-1.5 text-xs text-red-500 hover:bg-red-500/20 transition-colors"
        aria-label="Reset"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
