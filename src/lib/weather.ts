import { useEffect, useState } from 'react';

// The weather over Lake Qaraoun right now, from Open-Meteo (free, no key). It only colours the shore: drizzle and rain
// fall on the photo and ring the water, snow drifts down, fog lies over the lake, clouds veil the sky. If it can't be
// fetched the shore simply stays clear.

export type Sky = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'storm' | 'snow';
export type Weather = { sky: Sky; wind: number; label: string }; // wind in km/h

const CLEAR: Weather = { sky: 'clear', wind: 0, label: '' };
const LABELS: Record<Sky, string> = { clear: '', cloudy: 'Clouds over the lake', fog: 'Fog on the water', drizzle: 'Drizzle', rain: 'Rain on the lake', storm: 'Storm over the Bekaa', snow: 'Snow in the Bekaa' };
const KEY = 'lpb-weather';
const URL_ = 'https://api.open-meteo.com/v1/forecast?latitude=33.56&longitude=35.69&current=weather_code,cloud_cover,wind_speed_10m&timezone=Asia%2FBeirut';

// WMO weather codes → what the shore shows
function skyFor(code: number, cover: number): Sky {
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 61 || code === 56 || code === 57) return 'rain';
  if (code >= 51) return 'drizzle';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 3 || cover >= 70) return 'cloudy';
  return 'clear';
}

const make = (sky: Sky, wind = 8): Weather => ({ sky, wind, label: LABELS[sky] });

// ?weather=rain (or drizzle, storm, snow, fog, cloudy, clear) previews the shore in other weather, like ?at= for the hour
function preview(): Weather | null {
  const v = new URLSearchParams(location.search).get('weather') as Sky | null;
  return v && v in LABELS ? make(v) : null;
}

async function fetchWeather(): Promise<Weather> {
  try {
    const kept = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (kept && Date.now() - kept.at < 30 * 60_000) return kept.w;
  } catch { /* nothing kept */ }
  const r = await fetch(URL_);
  if (!r.ok) throw new Error('weather ' + r.status);
  const c = (await r.json()).current;
  const w = make(skyFor(Number(c.weather_code), Number(c.cloud_cover)), Number(c.wind_speed_10m) || 0);
  try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), w })); } catch { /* not kept */ }
  return w;
}

export function useWeather() {
  const [w, setW] = useState<Weather>(() => preview() || CLEAR);
  useEffect(() => {
    if (preview()) return;
    let live = true;
    const get = () => fetchWeather().then((x) => live && setW(x)).catch(() => {});
    get();
    const id = setInterval(get, 30 * 60_000);
    return () => { live = false; clearInterval(id); };
  }, []);
  return w;
}

export const wet = (s: Sky) => s === 'drizzle' || s === 'rain' || s === 'storm';
