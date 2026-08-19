/**
 * Coop's Fishing — solar & lunar / solunar calculations
 * Moon phase, rise/set approximations, and solunar major/minor periods.
 */

window.COOPS = window.COOPS || {};

(function (COOPS) {
  'use strict';

  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;

  function toJulian(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  function fromJulian(jd) {
    return new Date((jd - 2440587.5) * 86400000);
  }

  /** Moon age in days (0 = new moon) */
  function moonAge(date) {
    const jd = toJulian(date);
    // Known new moon: Jan 6 2000 ~ JD 2451550.1
    const daysSince = jd - 2451550.1;
    const period = 29.53058867;
    let age = daysSince % period;
    if (age < 0) age += period;
    return age;
  }

  function moonPhaseInfo(date) {
    const age = moonAge(date);
    const illum = (1 - Math.cos((2 * Math.PI * age) / 29.53058867)) / 2;
    const pct = Math.round(illum * 100);
    let name, emoji;
    if (age < 1.85) { name = 'New Moon'; emoji = '🌑'; }
    else if (age < 7.38) { name = 'Waxing Crescent'; emoji = '🌒'; }
    else if (age < 9.23) { name = 'First Quarter'; emoji = '🌓'; }
    else if (age < 14.77) { name = 'Waxing Gibbous'; emoji = '🌔'; }
    else if (age < 16.61) { name = 'Full Moon'; emoji = '🌕'; }
    else if (age < 22.15) { name = 'Waning Gibbous'; emoji = '🌖'; }
    else if (age < 23.99) { name = 'Last Quarter'; emoji = '🌗'; }
    else if (age < 29.53) { name = 'Waning Crescent'; emoji = '🌘'; }
    else { name = 'New Moon'; emoji = '🌑'; }
    return { age, illum, pct, name, emoji };
  }

  /** Approximate moon position (ecliptic longitude deg) for solunar */
  function moonLongitude(date) {
    const jd = toJulian(date);
    const T = (jd - 2451545.0) / 36525;
    // Mean longitude
    let L = 218.316 + 481267.881 * T;
    // Mean anomaly
    let M = 134.963 + 477198.868 * T;
    L = ((L % 360) + 360) % 360;
    M = ((M % 360) + 360) % 360;
    // Simple equation of center
    const lon = L + 6.289 * Math.sin(M * DEG);
    return ((lon % 360) + 360) % 360;
  }

  function sunLongitude(date) {
    const jd = toJulian(date);
    const n = jd - 2451545.0;
    const L = (280.460 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * DEG;
    const lon = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
    return ((lon % 360) + 360) % 360;
  }

  /**
   * Solunar major periods: moon overhead / underfoot (when moon lon ~ sun lon + 0/180 relative to local meridian approx)
   * Simplified: use times when moon's hour angle is 0 or 180 at given lat/lon.
   * Practical angler model: majors ~ 2 hrs around moon transit & anti-transit;
   * minors ~ 1 hr around moonrise & moonset.
   */
  function solarNoonAndDayLength(date, lat, lon) {
    // Use NOAA-style approximation
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    const jd = toJulian(day);
    const n = Math.ceil(jd - 2451545.0 + 0.0008);
    const Jstar = n - lon / 360;
    const M = (357.5291 + 0.98560028 * Jstar) % 360;
    const C = 1.9148 * Math.sin(M * DEG) + 0.02 * Math.sin(2 * M * DEG);
    const λ = (M + C + 180 + 102.9372) % 360;
    const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(M * DEG) - 0.0069 * Math.sin(2 * λ * DEG);
    const δ = Math.asin(Math.sin(λ * DEG) * Math.sin(23.44 * DEG));
    const latR = lat * DEG;
    const cosH = (Math.sin(-0.83 * DEG) - Math.sin(latR) * Math.sin(δ)) / (Math.cos(latR) * Math.cos(δ));
    let sunrise = null, sunset = null, noon = fromJulian(Jtransit);
    if (cosH >= -1 && cosH <= 1) {
      const H = Math.acos(cosH) * RAD;
      const Jrise = Jtransit - H / 360;
      const Jset = Jtransit + H / 360;
      sunrise = fromJulian(Jrise);
      sunset = fromJulian(Jset);
    }
    return { sunrise, sunset, noon, declination: δ * RAD };
  }

  /** Approximate moonrise/moonset for a day (iterative simple model) */
  function moonRiseSet(date, lat, lon) {
    // Sample every hour and find altitude sign changes
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    let rise = null, set = null;
    let prevAlt = moonAltitude(start, lat, lon);
    for (let m = 15; m <= 24 * 60; m += 15) {
      const t = new Date(start.getTime() + m * 60000);
      const alt = moonAltitude(t, lat, lon);
      if (prevAlt < 0 && alt >= 0 && !rise) rise = t;
      if (prevAlt >= 0 && alt < 0 && !set) set = t;
      prevAlt = alt;
    }
    return { rise, set };
  }

  function moonAltitude(date, lat, lon) {
    // Rough: moon RA ≈ lon_ecliptic, dec ≈ 0 * 23.4 oscillation simplified
    const lonM = moonLongitude(date);
    const jd = toJulian(date);
    const T = (jd - 2451545.0) / 36525;
    // Mean inclination effect
    const F = (93.272 + 483202.018 * T) * DEG;
    const dec = 5.15 * Math.sin(F); // max ~5° + ecliptic tilt simplified
    const eclipticObl = 23.44;
    const decR = (dec + eclipticObl * Math.sin(lonM * DEG)) * DEG * 0.4; // dampened approx
    // Local sidereal
    const ut = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const d = jd - 2451545.0;
    let LST = (100.46 + 0.985647 * d + lon + 15 * ut) % 360;
    if (LST < 0) LST += 360;
    // Moon RA approx = lonM
    let HA = LST - lonM;
    if (HA > 180) HA -= 360;
    if (HA < -180) HA += 360;
    const latR = lat * DEG;
    const haR = HA * DEG;
    const alt = Math.asin(
      Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(haR)
    ) * RAD;
    return alt;
  }

  /** Moon transit (highest altitude) approx for the day */
  function moonTransit(date, lat, lon) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    let best = start, bestAlt = -999;
    for (let m = 0; m < 24 * 60; m += 10) {
      const t = new Date(start.getTime() + m * 60000);
      const alt = moonAltitude(t, lat, lon);
      if (alt > bestAlt) {
        bestAlt = alt;
        best = t;
      }
    }
    const underfoot = new Date(best.getTime() + 12 * 3600000);
    // normalize underfoot to same calendar day if possible
    return { transit: best, underfoot, maxAlt: bestAlt };
  }

  function formatTime(d, tzHint) {
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function addHours(d, h) {
    return new Date(d.getTime() + h * 3600000);
  }

  /**
   * Build full day package for charts
   */
  function dayAstro(date, lat, lon) {
    const phase = moonPhaseInfo(date);
    const solar = solarNoonAndDayLength(date, lat, lon);
    const mrs = moonRiseSet(date, lat, lon);
    const mt = moonTransit(date, lat, lon);

    const majors = [];
    if (mt.transit) {
      majors.push({
        label: 'Major — Moon Overhead',
        start: addHours(mt.transit, -1),
        end: addHours(mt.transit, 1),
        peak: mt.transit
      });
    }
    if (mt.underfoot) {
      const uf = mt.underfoot;
      // keep on requested day when possible
      majors.push({
        label: 'Major — Moon Underfoot',
        start: addHours(uf, -1),
        end: addHours(uf, 1),
        peak: uf
      });
    }

    const minors = [];
    if (mrs.rise) {
      minors.push({
        label: 'Minor — Moonrise',
        start: addHours(mrs.rise, -0.5),
        end: addHours(mrs.rise, 0.5),
        peak: mrs.rise
      });
    }
    if (mrs.set) {
      minors.push({
        label: 'Minor — Moonset',
        start: addHours(mrs.set, -0.5),
        end: addHours(mrs.set, 0.5),
        peak: mrs.set
      });
    }

    // Solunar day rating (classic angler heuristic)
    let rating = 2; // fair
    const age = phase.age;
    if (age < 1.5 || age > 28 || (age > 13.5 && age < 16.5)) rating = 5; // new/full
    else if (age < 3.5 || age > 26 || (age > 11.5 && age < 18.5)) rating = 4;
    else if (age < 6 || age > 23.5) rating = 3;

    // golden hour approx
    let goldenMorning = null, goldenEvening = null, blueMorning = null, blueEvening = null;
    if (solar.sunrise && solar.sunset) {
      goldenMorning = { start: solar.sunrise, end: addHours(solar.sunrise, 1) };
      goldenEvening = { start: addHours(solar.sunset, -1), end: solar.sunset };
      blueMorning = { start: addHours(solar.sunrise, -0.5), end: solar.sunrise };
      blueEvening = { start: solar.sunset, end: addHours(solar.sunset, 0.5) };
    }

    return {
      date,
      phase,
      sunrise: solar.sunrise,
      sunset: solar.sunset,
      solarNoon: solar.noon,
      moonrise: mrs.rise,
      moonset: mrs.set,
      majors,
      minors,
      rating,
      goldenMorning,
      goldenEvening,
      blueMorning,
      blueEvening,
      dayLengthHrs: solar.sunrise && solar.sunset
        ? (solar.sunset - solar.sunrise) / 3600000
        : null
    };
  }

  function monthPhases(year, month) {
    // month 0-indexed
    const days = new Date(year, month + 1, 0).getDate();
    const out = [];
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d, 12, 0, 0);
      out.push({ day: d, date, ...moonPhaseInfo(date) });
    }
    return out;
  }

  function ratingLabel(n) {
    return ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][n] || 'Fair';
  }

  COOPS.astro = {
    moonPhaseInfo,
    dayAstro,
    monthPhases,
    formatTime,
    ratingLabel,
    addHours
  };
})(window.COOPS);
