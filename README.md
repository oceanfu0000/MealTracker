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
    *(Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENAI_API_KEY`)*

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
- 💾 **Real-time Sync**: All data stored securely in Supabase with RLS

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenAI GPT-4 Vision API
- **State Management**: Zustand
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account ([create one free](https://supabase.com))
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))


### Installation

1. **Clone the repository**

```bash
cd MealTracker2
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up Supabase**

- Create a new project in [Supabase Dashboard](https://app.supabase.com)
- Go to SQL Editor and run the migration script from `supabase_migration.sql`
- **Configure Registration Code**:
    - Open `access_codes_migration.sql`
    - Change `'apple'` to your desired access code (e.g., `'secret123'`)
    - Run this script in the Supabase SQL Editor too


4. **Configure environment variables**

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=sk-your-openai-key
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
MealTracker2/
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

### OpenAI GPT-4 Vision

The app uses GPT-4 Vision to analyze meal photos. Images are automatically compressed before sending to reduce token costs.

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

### Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com)
3. Add environment variables
4. Deploy!

### Deploy to Netlify

1. Push code to GitHub
2. Import project in [Netlify Dashboard](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables
6. Deploy!

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

**AI meal analysis not working**
- Check OpenAI API key is valid
- Ensure you have API credits available
- Try with a smaller image



## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please open an issue on GitHub or contact support.

---

Built with ❤️ using React, Supabase, and OpenAI
