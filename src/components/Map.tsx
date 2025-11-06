'use client';

import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default icon issue with Leaflet in Next.js
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

interface MapProps {
  raceLines: Record<string, [number, number][]>;
  availableDrivers: { id: string; name: string; color: string }[];
}

export default function Map({ raceLines, availableDrivers }: MapProps) {
  // Find the first available race line to set the initial center
  const firstDriverId = Object.keys(raceLines)[0];
  const center = firstDriverId && raceLines[firstDriverId].length > 0
    ? raceLines[firstDriverId][0]
    : [33.59, -86.79]; // Default center if no race lines

  const getDriverColor = (driverId: string) => {
    return availableDrivers.find((d) => d.id === driverId)?.color || '#CCCCCC';
  };

  return (
    <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {Object.entries(raceLines).map(([driverId, path]) => (
        <div key={driverId}>
          <Polyline pathOptions={{ color: getDriverColor(driverId) }} positions={path} />
          {path.length > 0 && <Marker position={path[0]} />}
        </div>
      ))}
    </MapContainer>
  );
}