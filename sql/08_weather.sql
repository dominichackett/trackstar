CREATE TABLE weather (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id uuid REFERENCES races(id),
    time_utc_seconds integer,
    time_utc_str text,
    air_temp float,
    track_temp float,
    humidity float,
    pressure float,
    wind_speed float,
    wind_direction integer,
    rain integer,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS) for the weather table
ALTER TABLE public.weather ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to view weather data
CREATE POLICY "Enable read access for all users" ON public.weather
  FOR SELECT USING (true);
