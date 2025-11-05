CREATE TABLE telemetry (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    race_id uuid REFERENCES races(id),
    driver_id uuid REFERENCES drivers(id),
    lap_number integer,
    timestamp timestamptz,
    name text,
    value float,
    created_at timestamptz DEFAULT now()
);
