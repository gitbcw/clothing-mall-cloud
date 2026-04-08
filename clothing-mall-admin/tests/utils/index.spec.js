import { deepClone, uniqueArr, isExternal } from '@/utils'

describe('index.js', () => {
  describe('deepClone', () => {
    it('should clone simple object', () => {
      const source = { a: 1, b: 'test' }
      const clone = deepClone(source)

      expect(clone).toEqual(source)
      expect(clone).not.toBe(source)
    })

    it('should clone nested object', () => {
      const source = { a: { b: { c: 1 } } }
      const clone = deepClone(source)

      expect(clone.a.b.c).toBe(1)
      expect(clone.a).not.toBe(source.a)
    })

    it('should clone array', () => {
      const source = [1, 2, { a: 1 }]
      const clone = deepClone(source)

      expect(clone).toEqual(source)
      expect(clone).not.toBe(source)
      expect(clone[2]).not.toBe(source[2])
    })

    it('should throw error for invalid input', () => {
      // deepClone throws error when source is falsy AND not an object
      // null is an object in JavaScript, so it doesn't throw
      expect(() => deepClone()).toThrow()
    })
  })

  describe('uniqueArr', () => {
    it('should remove duplicates', () => {
      expect(uniqueArr([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
      expect(uniqueArr(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
    })

    it('should return empty array for empty input', () => {
      expect(uniqueArr([])).toEqual([])
    })

    it('should preserve order of first occurrence', () => {
      expect(uniqueArr([3, 1, 2, 1, 3])).toEqual([3, 1, 2])
    })
  })

  describe('isExternal', () => {
    it('should identify external URLs', () => {
      expect(isExternal('https://example.com')).toBe(true)
      expect(isExternal('http://example.com')).toBe(true)
      expect(isExternal('mailto:test@example.com')).toBe(true)
      expect(isExternal('tel:12345678')).toBe(true)
    })

    it('should identify internal paths', () => {
      expect(isExternal('/dashboard')).toBe(false)
      expect(isExternal('/user/list')).toBe(false)
    })
  })
})
