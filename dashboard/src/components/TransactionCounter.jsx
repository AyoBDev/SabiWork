'use client'

import { Activity, TrendingUp } from 'lucide-react'

function OdometerDigit({ digit }) {
  return (
    <span
      className="inline-block h-[1em] overflow-hidden relative"
      style={{ width: '0.6em' }}
    >
      <span
        className="inline-flex flex-col transition-transform duration-[600ms] ease-out"
        style={{ transform: `translateY(-${digit}em)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span
            key={n}
            className="h-[1em] flex items-center justify-center"
          >
            {n}
          </span>
        ))}
      </span>
    </span>
  )
}

function AnimatedNumber({ value, prefix = '' }) {
  const digits = String(value).split('')

  return (
    <span className="inline-flex items-center">
      {prefix && <span>{prefix}</span>}
      {digits.map((char, i) => {
        if (char === ',' || char === '.') {
          return (
            <span key={`sep-${i}`} className="h-[1em] flex items-center">
              {char}
            </span>
          )
        }
        return <OdometerDigit key={`${i}-${digits.length}`} digit={parseInt(char, 10)} />
      })}
    </span>
  )
}

function formatCount(num) {
  return num.toLocaleString('en-NG')
}

function formatVolume(num) {
  return num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TransactionCounter({ count, volume }) {
  return (
    <div className="flex items-center gap-8">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="font-mono font-bold text-3xl text-foreground overflow-hidden">
            <AnimatedNumber value={formatCount(count)} />
          </span>
          <span className="text-xs text-muted-foreground">Transactions</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="font-mono font-bold text-2xl text-foreground overflow-hidden">
            <AnimatedNumber value={formatVolume(volume)} prefix="\u20A6" />
          </span>
          <span className="text-xs text-muted-foreground">Value Moved</span>
        </div>
      </div>
    </div>
  )
}
