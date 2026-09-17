/**
 * LAERS — Battery Intelligence Engine
 * Subsystem 01: Sensor & Telemetry Layer
 * 
 * Simulates low-temperature ruggedized avionics sensor acquisition:
 * - 4-wire RTD temperature probes embedded in battery core & case
 * - Hall-effect precision shunt current transducer
 * - Multi-tap 6S isolated cell voltage taps
 * - High-altitude barometric & humidity ambient sensors
 * 
 * Includes sensor noise modeling and health quality tagging (GOOD, DEGRADED, MISSING).
 */

import { SensorReading, RawTelemetryFrame, SensorQuality } from './types';

export class SensorAcquisitionLayer {
  private noiseEnabled: boolean = true;
  private sensorQualities: Record<string, SensorQuality> = {
    temp: 'GOOD',
    ambient: 'GOOD',
    voltage: 'GOOD',
    current: 'GOOD',
    soc: 'GOOD',
    pressure: 'GOOD',
    humidity: 'GOOD',
  };

  public setNoiseEnabled(enabled: boolean) {
    this.noiseEnabled = enabled;
  }

  public setSensorQuality(channel: string, quality: SensorQuality) {
    this.sensorQualities[channel] = quality;
  }

  public getSensorQualities() {
    return { ...this.sensorQualities };
  }

  private addNoise(mean: number, stdDev: number, channel: string): number {
    const q = this.sensorQualities[channel] ?? 'GOOD';
    if (q === 'MISSING') {
      return NaN;
    }
    if (!this.noiseEnabled) {
      return mean;
    }
    // Box-Muller transform for Gaussian noise
    const u1 = Math.random() || 1e-6;
    const u2 = Math.random() || 1e-6;
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    // If DEGRADED, noise amplitude is 4x higher and small bias drift is introduced
    const effectiveStdDev = q === 'DEGRADED' ? stdDev * 4.0 : stdDev;
    const bias = q === 'DEGRADED' ? stdDev * 1.5 : 0.0;
    return mean + z * effectiveStdDev + bias;
  }

  public sampleTelemetry(
    timestampSec: number,
    groundTruth: {
      batteryTempC: number;
      ambientTempC: number;
      voltageV: number;
      currentA: number;
      socPct: number;
      pressureMmhg: number;
      humidityPct: number;
      cycleCount: number;
    }
  ): RawTelemetryFrame {
    const rawTBatt = this.addNoise(groundTruth.batteryTempC, 0.12, 'temp');
    const rawTAmb = this.addNoise(groundTruth.ambientTempC, 0.25, 'ambient');
    const rawVolt = this.addNoise(groundTruth.voltageV, 0.025, 'voltage');
    const rawCurr = this.addNoise(groundTruth.currentA, 0.15, 'current');
    const rawSoc = this.addNoise(groundTruth.socPct, 0.18, 'soc');
    const rawBaro = this.addNoise(groundTruth.pressureMmhg, 1.2, 'pressure');
    const rawHum = this.addNoise(groundTruth.humidityPct, 0.8, 'humidity');

    // Build raw hex telemetry frame representation for low-level avionics inspection
    // Format: [SYNC 0x55AA] [TIME 4B] [VBAT 2B] [IBAT 2B] [TBAT 2B] [TAMB 2B] [CRC 2B]
    const hexTime = (timestampSec & 0xffff).toString(16).padStart(4, '0').toUpperCase();
    const hexVolt = Math.round(Math.max(0, rawVolt) * 100).toString(16).padStart(4, '0').toUpperCase();
    const hexCurr = Math.round(Math.max(0, rawCurr) * 10).toString(16).padStart(4, '0').toUpperCase();
    const hexTBatt = ((Math.round((rawTBatt + 100) * 10)) & 0xffff).toString(16).padStart(4, '0').toUpperCase();
    const hexTAmb = ((Math.round((rawTAmb + 100) * 10)) & 0xffff).toString(16).padStart(4, '0').toUpperCase();
    const rawHexPayload = `55AA:${hexTime}:${hexVolt}:${hexCurr}:${hexTBatt}:${hexTAmb}:E3F1`;

    return {
      timestampSec,
      batteryTempC: {
        value: Number(rawTBatt.toFixed(2)),
        unit: '°C',
        timestamp: timestampSec,
        source: 'PT1000_CORE_RTD_CH01',
        quality: this.sensorQualities.temp,
        provenance: 'MEASURED',
      },
      ambientTempC: {
        value: Number(rawTAmb.toFixed(2)),
        unit: '°C',
        timestamp: timestampSec,
        source: 'ENCLOSURE_EXT_NTC_CH04',
        quality: this.sensorQualities.ambient,
        provenance: 'MEASURED',
      },
      voltageV: {
        value: Number(rawVolt.toFixed(3)),
        unit: 'V',
        timestamp: timestampSec,
        source: 'ISO_ADC_ADS131M04_CH0',
        quality: this.sensorQualities.voltage,
        provenance: 'MEASURED',
      },
      currentA: {
        value: Number(rawCurr.toFixed(2)),
        unit: 'A',
        timestamp: timestampSec,
        source: 'ISABELLENHUTTE_SHUNT_CH1',
        quality: this.sensorQualities.current,
        provenance: 'MEASURED',
      },
      socPct: {
        value: Number(Math.min(100, Math.max(0, rawSoc)).toFixed(2)),
        unit: '%',
        timestamp: timestampSec,
        source: 'COULOMB_COUNTER_BQ34Z100',
        quality: this.sensorQualities.soc,
        provenance: 'MEASURED',
      },
      pressureMmhg: {
        value: Number(rawBaro.toFixed(1)),
        unit: 'mmHg',
        timestamp: timestampSec,
        source: 'BARO_MS5611_HIGH_ALT',
        quality: this.sensorQualities.pressure,
        provenance: 'MEASURED',
      },
      humidityPct: {
        value: Number(Math.max(0, rawHum).toFixed(1)),
        unit: '%',
        timestamp: timestampSec,
        source: 'SHT31_ENVIRONMENTAL',
        quality: this.sensorQualities.humidity,
        provenance: 'MEASURED',
      },
      cycleCount: {
        value: groundTruth.cycleCount,
        unit: 'cycles',
        timestamp: timestampSec,
        source: 'EEPROM_NVRAM_LOG',
        quality: 'GOOD',
        provenance: 'MEASURED',
      },
      rawHexPayload,
    };
  }
}

export const sensorLayer = new SensorAcquisitionLayer();
