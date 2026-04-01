# Peace Within - Product Requirements Document

## Overview
**Peace Within** is a mobile wellness app that helps users track their emotional state, receive AI-powered spiritual guidance, and build a daily mindfulness habit. The app combines mood tracking, AI-generated content, and spiritual wellness tools in a calm, earth-toned interface.

## Tech Stack
- **Frontend**: React Native (Expo SDK 54) with Expo Router
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (via Motor async driver)
- **AI**: OpenAI GPT-4o via Emergent LLM Key (emergentintegrations library)
- **Payments**: Stripe via emergentintegrations library
- **Auth**: JWT-based custom authentication with bcrypt

## Features

### 1. Authentication
- Email/password registration and login
- JWT token-based session management (72h expiry)
- Secure password hashing with bcrypt

### 2. Daily Affirmation
- AI-generated personalized affirmation on home screen
- Cached per day per user to avoid regeneration
- Based on user's recent mood data

### 3. Emotional Check-in
- 8 mood options: Happy, Calm, Grateful, Stressed, Sad, Angry, Anxious, Tired
- Each check-in generates:
  - **Motivational message** (2-3 sentences)
  - **Scripture/spiritual verse** with explanation
  - **Grounding exercise** (3-5 numbered steps)

### 4. AI Chat
- Conversational AI wellness guide for relationships, stress, and personal growth
- Session-based chat with history persistence
- Free tier: 5 messages/day; Premium: unlimited
- Suggested conversation starters

### 5. Progress Tracker
- Mood distribution chart (bar visualization)
- Daily wellness score trend (last 7 days)
- Check-in streak counter
- Most frequent mood summary

### 6. Subscription (Stripe)
- $5.99/month Premium plan
- Benefits: Unlimited AI chats, deeper spiritual guidance
- Stripe Checkout integration with payment status polling
- Payment transactions tracked in MongoDB

### 7. Profile
- User info display with avatar initial
- Premium/Free plan badge
- Check-in stats
- Logout functionality

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET | /api/user/profile | Get user profile |
| GET | /api/affirmation | Get daily affirmation |
| POST | /api/checkin | Submit mood check-in |
| GET | /api/checkins | Get check-in history |
| POST | /api/chat | Send chat message |
| GET | /api/chat/history | Get chat messages |
| GET | /api/chat/sessions | List chat sessions |
| GET | /api/progress | Get progress data |
| POST | /api/subscription/checkout | Create Stripe session |
| GET | /api/subscription/status/{id} | Check payment status |
| POST | /api/webhook/stripe | Stripe webhook |

## MongoDB Collections
- `users` - User accounts and premium status
- `mood_checkins` - Mood entries with AI-generated content
- `chat_messages` - Chat conversation history
- `affirmations` - Cached daily affirmations
- `payment_transactions` - Stripe payment records

## Design System
- **Primary**: Sage Green (#4A6741)
- **Secondary**: Warm Clay (#C18C5D)
- **Background**: Off-White (#F9F7F2)
- **Text**: Soft Charcoal (#2D332A)
- **Cards**: White (#FFFFFF) with boxShadow (platform-aware), 20-24px border radius
- **Buttons**: Rounded (28px), primary green with subtle shadow
- **Shadows**: Using Platform.select() with boxShadow for iOS/web, elevation for Android (deprecation-free)

## Recent Improvements (v1.1)
- Rebranded app.json with "Peace Within" name, green splash screen, bundle identifiers
- Fixed all shadow* deprecation warnings → migrated to boxShadow/elevation
- Added safe area insets to welcome screen
- Added date display on home screen
- Enhanced affirmation card with loading state text
- Added "Talk to Peace Guide" quick action on home
- Added "View All" link to recent check-ins
- Added auth token expiry handling (auto-redirect to login)
- Enhanced chat with welcome message, premium indicator, typing dots animation
- Added timestamps to chat messages
- Enhanced mood result screen with mood-specific messages and "Talk to Peace Guide" button
- Progress screen: Added wellness level indicator, colored trend bars, percentage mood distribution
- Profile screen: Member since date, pull-to-refresh, enhanced premium card with more features listed
- Scripture card now has dark background for visual contrast

## Business Enhancement
- **Engagement Loop**: Daily affirmation + check-in streak gamification drives daily active use
- **Revenue**: $5.99/month premium tier with AI chat limit as conversion driver (5 free/day → unlimited)
- **Retention**: Progress tracker visualizes improvement, encouraging continued use
