/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as lamejs from 'lamejs';

/**
 * Converts Base64 PCM data to an AudioBuffer.
 */
export async function pcmToAudioBuffer(pcmBase64: string, sampleRate = 24000): Promise<AudioBuffer> {
  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(len);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) view[i] = binaryString.charCodeAt(i);
  
  const int16Data = new Int16Array(buffer);
  const float32Data = new Float32Array(int16Data.length);
  for (let i = 0; i < int16Data.length; i++) {
    float32Data[i] = int16Data[i] / 32768.0;
  }
  
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  const audioBuffer = audioCtx.createBuffer(1, float32Data.length, sampleRate);
  audioBuffer.getChannelData(0).set(float32Data);
  await audioCtx.close();
  return audioBuffer;
}

/**
 * Encodes an AudioBuffer to an MP3 Blob URL.
 */
export function audioBufferToMp3Url(buffer: AudioBuffer): string | null {
  if (typeof lamejs === 'undefined') {
    console.error("lamejs not loaded");
    return null;
  }

  const channels = 1;
  const sampleRate = buffer.sampleRate;
  const kbps = 128;
  
  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const rawData = buffer.getChannelData(0);
  const samples = new Int16Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    const s = Math.max(-1, Math.min(1, rawData[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  const sampleBlockSize = 1152;
  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const sampleChunk = samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }
  
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Uint8Array(mp3buf));
  }

  const blob = new Blob(mp3Data, { type: 'audio/mp3' });
  return URL.createObjectURL(blob);
}

/**
 * Performs basic time stretching on an AudioBuffer.
 * Note: This is a simple implementation and might have some artifacts.
 */
export async function performTimeStretch(audioBuffer: AudioBuffer, speed: number): Promise<AudioBuffer> {
  if (speed === 1.0) return audioBuffer;

  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;
  const inputData = audioBuffer.getChannelData(0); 
  
  const winSize = 2048; 
  const overlap = 0.5; 
  const hs = Math.floor(winSize * overlap); 
  const ha = Math.floor(hs * speed); 
  
  const newLength = Math.floor(inputData.length / speed);
  
  const offlineCtx = new OfflineAudioContext(channels, newLength, sampleRate);
  const outBuffer = offlineCtx.createBuffer(channels, newLength, sampleRate);
  const outData = outBuffer.getChannelData(0);
  
  const windowArray = new Float32Array(winSize);
  for (let i = 0; i < winSize; i++) {
    windowArray[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (winSize - 1)));
  }

  let inputIdx = 0;
  let outputIdx = 0;

  while (outputIdx + winSize < newLength && inputIdx + winSize < inputData.length) {
    for (let i = 0; i < winSize; i++) {
      outData[outputIdx + i] += inputData[Math.floor(inputIdx) + i] * windowArray[i];
    }
    inputIdx += ha;
    outputIdx += hs;
  }

  const normFactor = 1 / (1 / overlap * 0.55); 
  for (let i = 0; i < newLength; i++) {
    outData[i] *= normFactor;
  }

  return outBuffer;
}

/**
 * Converts Base64 PCM data to a WAV Blob URL.
 */
export function pcmToWav(pcmBase64: string, sampleRate = 24000): string {
  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(len);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) view[i] = binaryString.charCodeAt(i);
  
  const pcmData = new Int16Array(buffer);
  const wavHeaderBuffer = new ArrayBuffer(44);
  const viewHeader = new DataView(wavHeaderBuffer);
  
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2;
  const dataSize = pcmData.length * 2;
  
  const writeString = (v: DataView, o: number, s: string) => { 
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); 
  };
  
  writeString(viewHeader, 0, 'RIFF');
  viewHeader.setUint32(4, 36 + dataSize, true);
  writeString(viewHeader, 8, 'WAVE');
  writeString(viewHeader, 12, 'fmt ');
  viewHeader.setUint32(16, 16, true);
  viewHeader.setUint16(20, 1, true);
  viewHeader.setUint16(22, numChannels, true);
  viewHeader.setUint32(24, sampleRate, true);
  viewHeader.setUint32(28, byteRate, true);
  viewHeader.setUint16(32, numChannels * 2, true);
  viewHeader.setUint16(34, 16, true);
  writeString(viewHeader, 36, 'data');
  viewHeader.setUint32(40, dataSize, true);
  
  return URL.createObjectURL(new Blob([wavHeaderBuffer, pcmData], { type: 'audio/wav' }));
}
