# Proxima Tracker - Philippine Budget Tracking App

## Project Overview
A mobile-first budget tracking application specifically designed for Philippine users, featuring multiple wallet support, AI-powered insights, and comprehensive financial management.

## Tech Stack
- **Frontend**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL
- **AI**: OpenAI API integration
- **Currency**: Philippine Peso (₱) focused

## Core Features

### Multi-Wallet Support
- GCash Wallet
- BPI Bank Account
- UnionBank Account
- Custom wallet types
- Total/overall budget aggregation across all wallets

### Financial Management
- Income tracking per wallet
- Expense deduction per wallet
- Category-based transactions
- Transaction history
- Budget limits and alerts

### AI Features
- Spending pattern analysis
- Budget recommendations
- Expense categorization
- Financial insights and tips
- Predictive budgeting

### User Management
- Multi-account/login support via NextAuth
- User-specific wallet management
- Secure data isolation

## Design Requirements
- Mobile-first responsive design
- Philippine Peso currency formatting
- Clean, intuitive UI using shadcn components
- Dark/light mode support

## Development Guidelines
- Use TypeScript for type safety
- Implement proper error handling
- Follow Next.js best practices
- Ensure data security and privacy
- Optimize for Philippine internet conditions

## Environment Setup
- Use .env.example for environment variables template
- Include OpenAI API key configuration
- Database connection settings
- NextAuth configuration

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks