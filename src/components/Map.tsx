'use client';

import { MapContainer, TileLayer, Marker, useMap, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// No longer need to fix the default icon, as we are creating custom icons
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: '/marker-icon-2x.png',
//   iconUrl: '/marker-icon.png',
//   shadowUrl: '/marker-shadow.png',
// });

interface TelemetryPoint {
  lat: number;
  lon: number;
  timestamp: string;
  speed: number;
  rpm: number;
  throttle: number;
  accelPedal: number;
  brakeF: number;
  brakeR: number;
  accelX: number;
  accelY: number;
  steeringAngle: number;
  lapDist: number;
}

interface MapProps {
  raceLines: Record<string, TelemetryPoint[]>;
  availableDrivers: { id: string; name: string; }[];
  selectedLap: string;
  speedRange: {min: number, max: number};
}

function MapUpdater({ raceLines }: { raceLines: Record<string, TelemetryPoint[]> }) {
  const map = useMap();

  useEffect(() => {
    const allPoints = Object.values(raceLines).flat().map(p => [p.lat, p.lon]) as L.LatLngExpression[];
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds);
    }
  }, [raceLines, map]);

  return null;
}

const getColorForSpeed = (speed: number, minSpeed: number, maxSpeed: number) => {
  if (speed === null || speed === undefined) return '#808080'; // Grey for no data
  const speedRange = maxSpeed - minSpeed;
  if (speedRange === 0) return '#0000FF'; // Blue if speed is constant

  const percentage = (speed - minSpeed) / speedRange;
  const hue = (1 - percentage) * 240; // 0 (red) to 240 (blue)
  return `hsl(${hue}, 100%, 50%)`;
};

export default function Map({ raceLines, availableDrivers, selectedLap, speedRange }: MapProps) {
  console.log('RaceMap received raceLines:', raceLines);
  // Find the first available race line to set the initial center
  const firstDriverId = Object.keys(raceLines)[0];
  const center = firstDriverId && raceLines[firstDriverId].length > 0
    ? [raceLines[firstDriverId][0].lat, raceLines[firstDriverId][0].lon] as [number, number]
    : [33.59, -86.79] as [number, number]; // Default center if no race lines

  return (
    <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {Object.entries(raceLines).map(([driverId, path]) => {
        let lastMarkerTime: number | null = null;
        let markerIndex = 0;
        return (
          <div key={driverId}>
            {path.map((dataPoint, index) => {
              const { lat, lon, timestamp, speed, rpm, throttle, accelPedal, brakeF, brakeR, accelX, accelY, steeringAngle, lapDist } = dataPoint;
              const currentTime = new Date(timestamp).getTime();

              if (lastMarkerTime === null || currentTime - lastMarkerTime >= 1000) {
                lastMarkerTime = currentTime;
                markerIndex++;

                const color = getColorForSpeed(speed, speedRange.min, speedRange.max);
                const icon = L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="background-color:${color};width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">${markerIndex}</div>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                });

                return (
                  <Marker key={`${driverId}-${index}`} position={[lat, lon]} icon={icon}>
                    <Popup>
                      <div>
                        <h3>Telemetry Data</h3>
                        <p><strong>Lap:</strong> {selectedLap} | <strong>Time:</strong> {new Date(timestamp).toLocaleTimeString()}</p>
                        <p><strong>Speed:</strong> {speed?.toFixed(2)} km/h | <strong>RPM:</strong> {rpm?.toFixed(0)}</p>
                        <p><strong>Throttle:</strong> {throttle?.toFixed(2)} | <strong>Accel Pedal:</strong> {accelPedal?.toFixed(2)}</p>
                        <p><strong>Brake (F/R):</strong> {brakeF?.toFixed(2)} / {brakeR?.toFixed(2)}</p>
                        <p><strong>Accel (X/Y):</strong> {accelX?.toFixed(2)} / {accelY?.toFixed(2)}</p>
                        <p><strong>Steering:</strong> {steeringAngle?.toFixed(2)} | <strong>Lap Dist:</strong> {lapDist?.toFixed(2)} m</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              }
              return null;
            })}
          </div>
        )
      })}
      <MapUpdater raceLines={raceLines} />
    </MapContainer>
  );
}