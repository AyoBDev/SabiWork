'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, TrendingUp } from 'lucide-react'

const PERSONA_MAP = {
  'Mama Chioma': { role: 'Textile Trader', area: 'Balogun Market', score: 73, avatar: '👩🏾‍💼' },
  'Emeka': { role: 'Fabric Supplier', area: 'Oshodi', score: 61, avatar: '👨🏾‍💼' },
  'Adamu': { role: 'Plumber', area: 'Ikeja', score: 45, avatar: '👷🏾‍♂️' },
  'Blessing': { role: 'Hair Stylist', area: 'Lekki', score: 58, avatar: '💇🏾‍♀️' },
  'Kunle': { role: 'Investor', area: 'Victoria Island', score: 82, avatar: '🧑🏾‍💼' },
  'Fatima': { role: 'Food Vendor', area: 'Mile 12', score: 39, avatar: '🧑🏾‍🍳' },
  'Ade': { role: 'Angel Investor', area: 'Victoria Island', score: 88, avatar: '🧑🏾‍💼' },
  'Bisi': { role: 'Customer', area: 'Ikeja', score: 30, avatar: '👩🏾' },
}

function findPersona(actor) {
  if (!actor) return null
  // Direct match
  if (PERSONA_MAP[actor]) return { name: actor, ...PERSONA_MAP[actor] }
  // Partial match — check if any persona name appears in the actor string
  for (const [name, data] of Object.entries(PERSONA_MAP)) {
    if (actor.includes(name)) return { name, ...data }
  }
  // Check metadata references (worker_name, trader_name, etc.) handled by caller
  return null
}

export default function PersonaCard({ event }) {
  const [visible, setVisible] = useState(false)
  const [persona, setPersona] = useState(null)
  const timerRef = useRef(null)
  const prevTimestampRef = useRef(null)

  useEffect(() => {
    if (!event) return

    // Deduplicate by timestamp
    const eventKey = event.timestamp || JSON.stringify(event)
    if (prevTimestampRef.current === eventKey) return
    prevTimestampRef.current = eventKey

    // Try to find persona from actor or metadata
    const actor = event.actor || ''
    let found = findPersona(actor)

    // Also check metadata for named references
    if (!found && event.metadata) {
      const names = [event.metadata.worker_name, event.metadata.trader_name, event.metadata.supplier_name, event.metadata.investor]
      for (const name of names) {
        if (name) {
          found = findPersona(name)
          if (found) break
        }
      }
    }

    if (!found) return

    setPersona(found)
    setVisible(true)

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current)

    // Hide after 4 seconds
    timerRef.current = setTimeout(() => {
      setVisible(false)
    }, 4000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [event])

  if (!persona || !visible) return null

  return (
    <div className="absolute bottom-4 left-4 z-50 animate-slide-in">
      <Card className="w-72 border-border/50 bg-card/95 shadow-lg backdrop-blur-sm">
        <CardContent className="flex items-start gap-3 p-3">
          <span className="text-3xl leading-none">{persona.avatar}</span>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">{persona.name}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                <TrendingUp className="mr-0.5 h-3 w-3" />
                {persona.score}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{persona.role}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{persona.area}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
