export interface Track {
  id: string;
  name: string;
  image: string;
  length: string;
  finishLineGps: [number, number];
  pitInGps?: [number, number];
  pitOutGps?: [number, number];
  pitLaneTime?: string;
  sectorData?: Record<string, number | string>;
}

export const trackData: Track[] = [
  {
    id: 'barber',
    name: 'Barber Motorsports Park',
    image: '/barber-track-map.png',
    length: '2.28 miles',
    finishLineGps: [33.5326722, -86.6196083],
    pitInGps: [33.531077, -86.622592],
    pitOutGps: [33.531111, -86.622526],
    pitLaneTime: '34 seconds',
    sectorData: {
      'Circuit Center Line': 144672,
      'Sector 1 (SF > I1)': 40512,
      'Sector 2 (I1 > I2)': 62220,
      'Sector 3 (I2 > I3)': 41940.0,
      'Pit In to Pit Out': 18794.0,
    },
  },
  {
    id: 'cota',
    name: 'Circuit of the Americas',
    image: '/cota-track-map.png',
    length: '3.416 Miles',
    finishLineGps: [30.1335278, -97.6422583],
    pitInGps: [30.1343371, -97.6340257],
    pitOutGps: [30.1314446, -97.6389209],
    pitLaneTime: '36 seconds',
    sectorData: {
      'Circuit Center Line (m)': '5,498.3 m',
      'Sector 1 (m)': '1,308.8 m',
      'Sector 2 (m)': '2,240 m',
      'Sector 3 (m)': '1,949.5 m',
    },
  },
  {
    id: 'indy',
    name: 'Indianapolis Motor Speedway',
    image: '/indy-track-map.png',
    length: '2.439 miles',
    finishLineGps: [39.7931499, -86.2388700],
    pitInGps: [39.7894100, -86.2373000],
    pitOutGps: [39.79669, -86.23881],
    pitLaneTime: '63 seconds',
    sectorData: {
      'Circuit Center Line (in)': 154536,
      'Sector 1 (in)': 53712.0,
      'Sector 2 (in)': 54604.0,
      'Sector 3 (in)': 46220.0,
    },
  },
  {
    id: 'road-america',
    name: 'Road America',
    image: '/road-america-track-map.png',
    length: '4.014 miles',
    finishLineGps: [43.7979056, -87.9896333],
    pitInGps: [43.80057, -87.98992],
    pitOutGps: [43.7948061, -87.9897494],
    pitLaneTime: '52 seconds',
    sectorData: {
      'Sector 1 (in)': 81048.0,
      'Sector 2 (in)': 86928.0,
      'Sector 3 (in)': 86340.0,
    },
  },
  {
    id: 'sebring',
    name: 'Sebring International Raceway',
    image: '/sebring-track-map.png',
    length: '3.74 Miles',
    finishLineGps: [27.4502340, -81.3536980],
    pitInGps: [27.45012, -81.35547],
    pitOutGps: [27.45011, -81.35051],
    pitLaneTime: '39 Seconds',
    sectorData: {
      'Circuit Center Line (m)': '6,018.9 m',
      'Sector 1 (m)': '1,824.2 m',
      'Sector 2 (m)': '1,863.7 m',
      'Sector 3 (m)': '2,331.0 m',
    },
  },
  {
    id: 'sonoma',
    name: 'Sonoma Raceway',
    image: '/sonoma-track-map.png',
    length: '2.505 Miles',
    finishLineGps: [38.1615139, -122.4547166],
    pitLaneTime: '45 seconds',
    sectorData: {
      'Circuit Center Line (m)': '4,031.38m',
      'Sector 1 (m)': '1,385m',
      'Sector 2 (m)': '1,422m',
      'Sector 3 (m)': '1,225m',
    },
  },
  {
    id: 'vir',
    name: 'Virginia International Raceway',
    image: '/vir-track-map.png',
    length: '3.27 Miles',
    finishLineGps: [36.5688167, -79.2066639],
    pitInGps: [36.567581, -79.210428],
    pitOutGps: [36.568667, -79.206797],
    pitLaneTime: '25 seconds',
    sectorData: {
      'Circuit Center Line (m)': '5,262.6m',
      'Sector 1 (m)': '1,652.6m',
      'Sector 2 (m)': '2,158.0m',
      'Sector 3 (m)': '1,452m',
    },
  },
];
