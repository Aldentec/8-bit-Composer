export function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  // Interleave channels
  const samples = interleave(buffer);
  const byteRate = (sampleRate * numOfChan * bitDepth) / 8;
  const blockAlign = (numOfChan * bitDepth) / 8;

  const bufferLength = 44 + samples.length * 2;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  let offset = 0;

  // RIFF header
  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, 36 + samples.length * 2, true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;

  // fmt chunk
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, format, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bitDepth, true); offset += 2;

  // data chunk
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, samples.length * 2, true); offset += 4;

  // PCM samples
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Uint8Array(arrayBuffer);
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function interleave(buffer) {
  const nc = buffer.numberOfChannels;
  const len = buffer.length;
  const out = new Float32Array(len * nc);
  for (let i = 0; i < len; i++) {
    for (let ch = 0; ch < nc; ch++) {
      out[i * nc + ch] = buffer.getChannelData(ch)[i];
    }
  }
  return out;
}

/**
 * Encode WAV bytes to MP3 chunks.
 */
export function encodeWAVtoMP3(wavData) {
  const mp3encoder = new lamejs.Mp3Encoder(1, 44100, 128);
  const samples = new Int16Array(wavData.buffer, 44);
  const chunks = [];
  const chunkSize = 1152;

  for (let i = 0; i < samples.length; i += chunkSize) {
    const slice = samples.subarray(i, i + chunkSize);
    const buf = mp3encoder.encodeBuffer(slice);
    if (buf.length) chunks.push(new Uint8Array(buf));
  }

  const tail = mp3encoder.flush();
  if (tail.length) chunks.push(new Uint8Array(tail));

  return chunks;
}