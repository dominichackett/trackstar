# Trackstar

Trackstar is a web application for motorsports enthusiasts. It allows users to analyze telemetry data, compare lap times, and visualize track data.

## About The Project

This project is a Next.js application designed to provide a comprehensive platform for analyzing and visualizing motorsports data. It was developed as a submission for Hack the Track presented by Toyota GR 2025. It utilizes datasets from [https://trddev.com/hackathon-2025/](https://trddev.com/hackathon-2025/). A local Supabase instance or a project hosted on supabase.com is required for data storage. It includes features for tracking race results, analyzing lap-by-lap data, and visualizing track maps. The application is built with a modern tech stack and is designed to be extensible and scalable.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

* npm
  ```sh
  npm install npm@latest -g
  ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/your_username_/Project-Name.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
3. Run the development server
   ```sh
   npm run dev
   ```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Variables

To run this project, you will need to add the following environment variables to your `.env.local` file:

`SUPABASE_URL`
`SUPABASE_SERVICE_KEY`
`DATABASE_URL="postgresql://postgres:postgres@your-ip/postgres"`
`NEXT_PUBLIC_GEMINI_API_KEY` (for AI Race Engineer)
`NEXT_PUBLIC_SUPABASE_URL`
`NEXT_PUBLIC_SUPABASE_ANON_KEY`
`NEXT_PUBLIC_GEMINI_MODEL1 = 'gemini-2.0-flash-exp'`
`NEXT_PUBLIC_GEMINI_MODEL='gemini-2.5-flash-preview-09-2025'`
`NEXT_PUBLIC_GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/'`


## Features

*   **Race Results:** View results from different races.
*   **Lap Analysis:** Analyze lap times and telemetry data.
*   **Driver Deep Dive:** In-depth analysis of a driver's performance.
*   **Turn-by-Turn Analysis:** Analyze performance through each turn of the track.
*   **Track Visualization:** View interactive track maps.
*   **AI Chat:** An AI-powered chat assistant to help you analyze data.

## Technologies Used

*   [Next.js](https://nextjs.org/)
*   [React](https://reactjs.org/)
*   [TypeScript](https://www.typescriptlang.org/)
*   [Supabase](https://supabase.io/)
*   [Leaflet](https://leafletjs.com/)
*   [Recharts](https://recharts.org/)
*   [Tailwind CSS](https://tailwindcss.com/)

## Folder Structure

```
/
├── public/ # Static assets
├── scripts/ # Scripts for data uploading, specifically built to import the Barber Motorsport Park dataset
├── src/
│   ├── app/ # Next.js app directory
│   ├── components/ # Reusable React components
│   ├── lib/ # Library files
│   └── utils/ # Utility functions
└── sql/ # SQL scripts for database schema
```