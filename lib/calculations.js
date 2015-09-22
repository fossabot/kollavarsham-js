/*
 * kollavarsham
 * http://kollavarsham.org
 *
 * Copyright (c) 2014-2015 The Kollavarsham Team
 * Licensed under the MIT license.
 */

import Calendar from './calendar.js';
import Celestial from './celestial/index.js';
import JulianDate from './dates/julianDate.js';
import KollavarshamDate from './dates/kollavarshamDate.js';
import locations from './locations.js';
import MathHelper from './mathHelper.js';
import SakaDate from './dates/sakaDate.js';

class Calculations {

  constructor(settings = {}) {
    // TODO: No need to keep passing down the settings to all the classes. FIX IT
    this.celestial = new Celestial(settings);
    this.calendar = new Calendar(settings);
  }

  getPaksa(tithi) {
    return tithi >= 15 ? 'Krsnapaksa' : 'Suklapaksa';
  }

  fromGregorianToSaka(settings, gregorianDate) {
    // TODO: Add Tests if/when feasible
    let julianDay = Calendar.gregorianDateToJulianDay(gregorianDate);
    let ahargana = Calendar.julianDayToAhargana(julianDay);

    julianDay = MathHelper.truncate(julianDay + 0.5);

    // Definition of desantara
    //      http://books.google.com/books?id=kt9DIY1g9HYC&pg=PA683&lpg=PA683&dq=desantara&source=bl&ots=NLd1wFKFfN&sig=jCfG95R-6eiSff3L73DCodijo1I&hl=en&sa=X&ei=uKgHU__uKOr7yAGm0YGoBQ&ved=0CF8Q6AEwCDgK#v=onepage&q=desantara&f=false
    const desantara = (settings.longitude - locations.Ujjain.longitude) / 360;

    this.celestial.setAyanamsa(ahargana);

    // at 6 o'clock
    ahargana += 0.25;

    // desantara
    ahargana -= desantara;

    // time of sunrise at local latitude
    const equationOfTime = this.celestial.getDaylightEquation(gregorianDate.getFullYear(), settings.latitude, ahargana);
    ahargana -= equationOfTime;
    const {sunriseHour, sunriseMinute} = Celestial.getSunriseTime(equationOfTime);

    const {trueSolarLongitude, trueLunarLongitude} = this.celestial.setPlanetaryPositions(ahargana);

    // finding tithi and longitude of conjunction
    const tithi = Celestial.getTithi(trueSolarLongitude, trueLunarLongitude);

    // last conjunction & next conjunction
    const lastConjunctionLongitude = this.celestial.getLastConjunctionLongitude(ahargana, tithi);
    const nextConjunctionLongitude = this.celestial.getNextConjunctionLongitude(ahargana, tithi);

    const masaNum = Calendar.getMasaNum(trueSolarLongitude, lastConjunctionLongitude);

    // kali and Saka era
    const kaliYear = this.calendar.aharganaToKali(ahargana + ( 4 - masaNum ) * 30);
    const sakaYear = Calendar.kaliToSaka(kaliYear);

    let tithiDay = MathHelper.truncate(tithi) + 1;

    const paksa = this.getPaksa(tithiDay);
    tithiDay = tithiDay >= 15 ? tithiDay -= 15 : tithiDay;

    const {sauraMasa, sauraDivasa} = this.calendar.getSauraMasaAndSauraDivasa(ahargana, desantara);

    const sakaDate = new SakaDate(sakaYear, masaNum, tithiDay, paksa);

    sakaDate.gregorianDate = gregorianDate;
    sakaDate.julianDay = julianDay;
    sakaDate.ahargana = MathHelper.truncate(ahargana + 0.5);  // Remove the decimals
    sakaDate.sauraMasa = sauraMasa;
    sakaDate.sauraDivasa = sauraDivasa;
    sakaDate.naksatra = Calendar.getNaksatra(trueLunarLongitude);
    sakaDate.kaliYear = kaliYear;
    sakaDate.adhimasa = Calendar.getAdhimasa(lastConjunctionLongitude, nextConjunctionLongitude);
    sakaDate.fractionalTithi = MathHelper.fractional(tithi);
    sakaDate.sunriseHour = sunriseHour;
    sakaDate.sunriseMinute = sunriseMinute;
    return sakaDate;
  }

  fromGregorian(settings, gregorianDate) {

    const sakaDate = this.fromGregorianToSaka(settings, gregorianDate);

    return sakaDate.generateKollavarshamDate();

  }

  toGregorian(settings) {
    // TODO: Implement this to convert a Kollavarsham date to Gregorian
    console.log('Settings: ' + JSON.stringify(settings)); // eslint-disable-line no-console
    throw new Error('Not implemented');
  }

  toGregorianFromSaka(sakaDate) {
    // TODO: Remove this method??
    // This is implemented specifically for the pancanga-nodejs cli (https://github.com/kollavarsham/pancanga-nodejs)
    // Could be removed when toGregorian has been implemented based on this

    const sakaYear = sakaDate.year;
    const masaNum = sakaDate.month;
    let tithiDay = sakaDate.tithi;
    const paksa = sakaDate.paksa;

    if (paksa === 'Krsnapaksa') {
      tithiDay += 15;
    }
    const kaliYear = Calendar.sakaToKali(sakaYear);
    const ahargana = this.calendar.kaliToAhargana(kaliYear, masaNum, tithiDay);
    this.getPaksa();
    let julianDay = Calendar.aharganaToJulianDay(ahargana);
    julianDay += 0.5;

    const modernDate = Calendar.julianDayToModernDate(julianDay);
    if (JulianDate.prototype.isPrototypeOf(modernDate)) {
      console.log('kollavarsham::toGregorianDate: *** Returning an instance of JulianDate class ***'); // eslint-disable-line no-console
    }

    // TODO: Not happy that the empty constructor will make this with MalayalamYear => 1, MalayalamMonth => 1, and MalayalamDate => 1
    // TODO: Think this through before implementing toGregorian above
    const kollavarshamDate = new KollavarshamDate();
    kollavarshamDate.gregorianDate = modernDate;
    kollavarshamDate.julianDay = julianDay;
    kollavarshamDate.ahargana = ahargana;
    kollavarshamDate.sakaDate = sakaDate;

    return kollavarshamDate;
  }

}

export default Calculations;