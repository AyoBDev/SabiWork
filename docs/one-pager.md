# SabiWork — One-Pager Summary

## The Problem

Nigeria has 60M+ informal workers, traders, and job seekers operating outside formal economic systems. They lack payment protection, verifiable financial identity, and structured access to opportunities. High youth unemployment persists while skilled workers depend on word-of-mouth and WhatsApp groups.

## The Solution

SabiWork is an intelligent economic platform that connects informal traders, job seekers, and financial services in one ecosystem — accessible via **PWA** and **WhatsApp**. It uses AI to match workers to jobs, parse natural language sales, and build verifiable financial identities from everyday transactions.

**Core capabilities:**
- AI-powered job matching (skills, proximity, trust score)
- Natural language transaction parsing for traders via WhatsApp
- SabiScore (0–100): alternative credit identity built from real economic activity
- Escrow protection for buyer-worker transactions
- Micro-investment rounds for trader growth funding

## Squad API Integration

| Squad Product | Function in SabiWork |
|---|---|
| **Bank Account Verification** | Identity verification at signup; confirms account ownership |
| **Virtual Account Creation** | Every worker/trader gets a dedicated virtual account on onboarding |
| **Payment Initiation** | Buyers pay for jobs via card, transfer, or USSD |
| **Transaction Verification** | Backend confirms payment before releasing worker payout |
| **Bank Transfer / Payout** | Instant disbursement to worker's bank after job completion |
| **Webhook Processing** | Real-time payment events trigger trust score updates |

Squad APIs are **central infrastructure** — not optional add-ons. Every transaction flows through Squad from booking to payout.

## Four Pillars Addressed

| Pillar | How |
|---|---|
| **AI Automation** | Groq LLM classifies intents, matches workers, parses trade messages, recommends career pathways |
| **Use of Data** | TimescaleDB time-series analytics, demand heatmaps, transaction pattern analysis, real-time dashboards |
| **Squad APIs** | 6 products integrated end-to-end across the full transaction lifecycle |
| **Financial Innovation** | SabiScore replaces traditional credit bureaus for the unbanked; progressive access to savings, microloans, and crowd-invest funding |

## Impact Potential

- **Target:** 10M informal workers, traders, and seekers across Nigeria
- **Year 1 goal:** 5,000 active users in Lagos
- **Channels:** PWA (smartphones) + WhatsApp (no app download required)
- **Revenue:** Escrow fees, wallet transaction fees, micro-loan commissions

## Tech Stack

Express.js + PostgreSQL/TimescaleDB + Redis | React PWA + Next.js Dashboard | Baileys WhatsApp Bot | Groq AI (Llama 3.3-70b) | Squad API (sandbox) | Railway (deploy)

## Team

| Name | Role |
|---|---|
| Ayobami Ayomikun | Full Stack Developer |
| Adekeye Olaoluwa | Product Designer / UX Strategy |

---

**Squad Hackathon 3.0 — Challenge 02: Intelligent Economic System**

GitHub: [github.com/AyoBDev/SabiWork](https://github.com/AyoBDev/SabiWork) | Live Demo: [dashboard-production-35ce.up.railway.app/try](https://dashboard-production-35ce.up.railway.app/try)
