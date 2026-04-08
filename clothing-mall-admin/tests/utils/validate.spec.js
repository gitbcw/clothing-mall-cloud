import { validUsername, isExternal } from '@/utils/validate'

describe('validate.js', () => {
  describe('validUsername', () => {
    it('should return true for valid usernames', () => {
      expect(validUsername('admin')).toBe(true)
      expect(validUsername('editor')).toBe(true)
    })

    it('should return false for invalid usernames', () => {
      expect(validUsername('invalid')).toBe(false)
      expect(validUsername('')).toBe(false)
      expect(validUsername('user')).toBe(false)
    })

    it('should handle whitespace', () => {
      expect(validUsername(' admin ')).toBe(true)
      expect(validUsername('  editor  ')).toBe(true)
    })
  })

  describe('isExternal', () => {
    it('should return true for external URLs', () => {
      expect(isExternal('https://example.com')).toBe(true)
      expect(isExternal('http://example.com')).toBe(true)
      expect(isExternal('mailto:test@example.com')).toBe(true)
      expect(isExternal('tel:12345678')).toBe(true)
    })

    it('should return false for internal paths', () => {
      expect(isExternal('/dashboard')).toBe(false)
      expect(isExternal('/user/profile')).toBe(false)
      expect(isExternal('dashboard')).toBe(false)
    })
  })
})
