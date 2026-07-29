import { describe, expect, it } from 'vitest';
import {
  getAvailableEventCardImageSlots,
  getVisibleEventCardImageSlots,
} from './eventCardImages';

describe('getVisibleEventCardImageSlots', () => {
  it('keeps the second image visible when the first image is removed', () => {
    expect(getVisibleEventCardImageSlots({
      imageUrl: null,
      imageUrl2: 'https://example.com/second.jpg',
    })).toEqual(['imageUrl2']);
  });

  it('returns both image slots when both images exist', () => {
    expect(getVisibleEventCardImageSlots({
      imageUrl: 'https://example.com/first.jpg',
      imageUrl2: 'https://example.com/second.jpg',
    })).toEqual(['imageUrl', 'imageUrl2']);
  });
});

describe('getAvailableEventCardImageSlots', () => {
  it('offers both slots for one two-photo selection when the card is empty', () => {
    expect(getAvailableEventCardImageSlots({
      imageUrl: null,
      imageUrl2: null,
    })).toEqual(['imageUrl', 'imageUrl2']);
  });

  it('offers only the remaining slot when one photo already exists', () => {
    expect(getAvailableEventCardImageSlots({
      imageUrl: 'https://example.com/first.jpg',
      imageUrl2: null,
    })).toEqual(['imageUrl2']);
    expect(getAvailableEventCardImageSlots({
      imageUrl: null,
      imageUrl2: 'https://example.com/second.jpg',
    })).toEqual(['imageUrl']);
  });

  it('offers no upload slot when the card already has two photos', () => {
    expect(getAvailableEventCardImageSlots({
      imageUrl: 'https://example.com/first.jpg',
      imageUrl2: 'https://example.com/second.jpg',
    })).toEqual([]);
  });
});
