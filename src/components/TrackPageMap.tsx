'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Base icon URLs from a reliable public source
const iconUrlBase = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/';

const blackIcon = new L.Icon({
  iconUrl: `${iconUrlBase}marker-icon-2x-black.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: `${iconUrlBase}marker-icon-2x-green.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: `${iconUrlBase}marker-icon-2x-red.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


interface TrackPageMapProps {
  position: [number, number];
  trackName: string;
  pitInGps?: [number, number];
  pitOutGps?: [number, number];
}

// Child component to programmatically update the map view
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

const TrackPageMap: React.FC<TrackPageMapProps> = ({ position, trackName, pitInGps, pitOutGps }) => {
  return (
    <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%', borderRadius: '8px' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={position} icon={blackIcon}>
        <Popup>
          {trackName} <br /> Finish Line
        </Popup>
      </Marker>
      {pitInGps && (
        <Marker position={pitInGps} icon={greenIcon}>
          <Popup>
            {trackName} <br /> Pit In
          </Popup>
        </Marker>
      )}
      {pitOutGps && (
        <Marker position={pitOutGps} icon={redIcon}>
          <Popup>
            {trackName} <br /> Pit Out
          </Popup>
        </Marker>
      )}
      <MapUpdater center={position} />
    </MapContainer>
  );
};

export default TrackPageMap;
