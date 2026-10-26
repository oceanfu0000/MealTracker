# Meal Tracker AI - Quick Start (TL;DR)

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Setup Environment:**
    Copy `.env.example` to `.env` and fill in your keys:
    ```bash
    cp .env.example .env
    ```
    *(Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The OpenAI key lives on the server, see [server/README.md](server/README.md).)*

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) in your browser.

> [!NOTE]
> **For Fun & Personal Use Only** 🧪
> This project was built as a fun experiment for personal tracking!
> Please be aware that the AI food analysis relies on the OpenAI API. If you are on a restricted plan, you may encounter strict daily limits (e.g., only a few image analyses per day). Plan your meals (and your credits) accordingly! 🍎

---

# Meal Tracker - Smart Nutrition Tracking

A mobile-first meal tracking web application with AI-powered nutrition analysis, built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- 🍎 **AI-Powered Meal Analysis**: Upload meal photos and get instant calorie and macro estimates using GPT-4 Vision
- 📊 **Daily Nutrition Tracking**: Track calories, protein, carbs, and fat with visual progress bars
- ⚡ **Quick Add Items**: Save frequently eaten items for instant logging
- 📱 **Mobile-First Design**: Responsive, touch-friendly interface optimized for phones

- 📈 **Personalized Targets**: Automatic nutrition goal calculation based on your profile
- 🏃 **Manual Activity Tracking**: Optionally log steps, active calories, and workouts
- 💾 **Real-time Sync**: All data stored securely in self-hosted Supabase with RLS
- 🔑 **Account Recovery**: Email confirmation and "forgot password" reset links

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Self-hosted Supabase (PostgreSQL + Auth + PostgREST) on an Ubuntu server, see [server/README.md](server/README.md)
- **AI**: OpenAI Responses API (GPT-4.1), called through a server-side proxy
- **State Management**: Zustand
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- The backend server running (see [server/README.md](server/README.md)), with an OpenAI API key ([get one here](https://platform.openai.com/api-keys)) in its `.env`


### Installation

1. **Clone the repository**

```bash
cd MealTracker
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up the backend**

The database, auth and AI proxy run on your own server with Docker. Setup, restore from a
Supabase backup, email and OpenAI configuration are in [server/README.md](server/README.md).
For a brand-new database, run `supabase_migration.sql`, then `access_codes_migration.sql` (change
`'apple'` to your own registration code first), then `server/migrations/*.sql`.


4. **Configure environment variables**

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://129-221-137-70.sslip.io
VITE_SUPABASE_ANON_KEY=your-anon-key   # ANON_KEY from the server's .env
```

5. **Run the development server**

```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Usage

### First Time Setup

1. Sign in
2. Complete your profile (age, weight, height, etc.)
3. Review your calculated nutrition targets
4. Start logging meals!

### Logging Meals

**Photo Method**:
1. Click the floating + button
2. Take a photo or upload from gallery
3. AI analyzes and estimates macros
4. Review and save

**Manual Method**:
1. Click the floating + button
2. Go to "Manual" tab
3. Enter description and macros
4. Save

**Quick Add Method**:
1. Create quick items in Profile
2. Click + button → "Quick Add" tab
3. Select item and adjust quantity
4. Add to log

### Activity Tracking

- Go to Profile page
- Enter steps, active calories, or workout details
- Save to track your daily activity

## Project Structure

```
MealTracker/
├── src/
│   ├── components/       # Reusable React components
│   │   ├── DailyHeader.tsx
│   │   ├── MealCard.tsx
│   │   ├── LogMealModal.tsx
│   │   └── ProfileSetup.tsx
│   ├── hooks/           # Custom React hooks
│   │   └── useAuth.ts
│   ├── lib/             # Core utilities
│   │   ├── supabase.ts  # Supabase client
│   │   └── api.ts       # API wrapper functions
│   ├── pages/           # Page components
│   │   ├── AuthPage.tsx
│   │   ├── HomePage.tsx
│   │   └── ProfilePage.tsx
│   ├── store/           # State management
│   │   └── index.ts
│   ├── types/           # TypeScript types
│   │   ├── database.types.ts
│   │   └── index.ts
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── supabase_migration.sql  # Database schema
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Database Schema

- **profiles**: User demographics and settings
- **nutrition_targets**: Daily calorie/macro goals
- **meal_logs**: Individual meal entries
- **quick_items**: Reusable meal templates
- **manual_activity**: Optional daily activity data
- **app_settings**: User preferences

All tables have Row-Level Security (RLS) enabled for data privacy.

## API Integration

### OpenAI (via server proxy)

Meal photo analysis, text analysis and the FAQ assistant use the OpenAI Responses API (`gpt-4.1` / `gpt-4.1-nano`).
The app sends requests to `/ai/v1/responses` on the server with the user's login token; the server adds
the OpenAI key, so it never ships in the browser bundle. Images are compressed before sending to reduce token costs.

### Nutrition Calculation

Daily targets are calculated using the Mifflin-St Jeor equation:
- BMR calculation based on age, weight, height
- Activity multiplier based on training frequency
- Goal adjustment (cut/bulk/maintain)
- Macro split: 2.2g protein/kg, 25% fat, remainder carbs

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy

The frontend deploys to GitHub Pages on every push to `main`, see [DEPLOYMENT.md](DEPLOYMENT.md).
The backend runs on the Ubuntu server, see [server/README.md](server/README.md).

## Customization

### Color Palette

Edit `tailwind.config.js` to customize colors:

```js
colors: {
  primary: { /* your green shades */ },
  accent: { /* your accent colors */ },
}
```

### Nutrition Formula

Modify the calculation logic in `src/lib/api.ts` → `calculateNutritionTargets()`

## Troubleshooting

**"Missing Supabase environment variables"**
- Ensure `.env` file exists and contains valid credentials

**AI meal analysis or FAQ not working**
- "AI is not set up on the server yet": add `OPENAI_API_KEY` to the server's `.env` and run `sudo docker compose up -d`
- "Daily AI limit reached": raise `AI_DAILY_LIMIT` in the server's `.env`
- Check the OpenAI key is valid and has credits: `sudo docker compose logs ai`
- Try with a smaller image

**Password reset / confirmation emails not arriving**
- Email needs `SMTP_*` settings in the server's `.env`, see [server/README.md](server/README.md)



## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please open an issue on GitHub or contact support.

---

Built with ❤️ using React, Supabase, and OpenAI
