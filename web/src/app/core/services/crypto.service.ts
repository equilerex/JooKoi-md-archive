import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CryptoService {
  private key = '';

  setKey(username: string): void {
    this.key = username;
  }

  encrypt(plaintext: string): string {
    if (!this.key) {
      return plaintext;
    }
    const base64 = btoa(unescape(encodeURIComponent(this.xor(plaintext, this.key))));
    return this.toBase64Url(base64);
  }

  decrypt(ciphertext: string): string {
    if (!this.key) {
      return ciphertext;
    }
    try {
      return this.xor(decodeURIComponent(escape(atob(this.fromBase64Url(ciphertext)))), this.key);
    } catch {
      return ciphertext;
    }
  }

  private toBase64Url(base64: string): string {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private fromBase64Url(value: string): string {
    let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const remainder = base64.length % 4;
    if (remainder === 2) {
      base64 += '==';
    } else if (remainder === 3) {
      base64 += '=';
    } else if (remainder === 1) {
      // Invalid length for base64; leave as-is so atob throws and decrypt() falls back.
    }
    return base64;
  }

  encryptSegment(segment: string): string {
    return 'e:' + this.encrypt(segment);
  }

  decryptSegment(segment: string): string {
    if (segment.startsWith('e:')) {
      return this.decrypt(segment.slice(2));
    }
    return segment;
  }

  isEncryptedSegment(segment: string): boolean {
    return segment.startsWith('e:');
  }

  private xor(input: string, key: string): string {
    const keyLen = key.length;
    let output = '';
    for (let i = 0; i < input.length; i++) {
      output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % keyLen));
    }
    return output;
  }
}
