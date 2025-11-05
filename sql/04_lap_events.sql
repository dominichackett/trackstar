CREATE TABLE lap_events (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    race_id uuid REFERENCES races(id),
    driver_id uuid REFERENCES drivers(id),
    lap_number integer,
    event_type text,
    timestamp timestamptz,
    created_at timestamptz DEFAULT now()
);
