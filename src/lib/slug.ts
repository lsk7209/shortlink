import { customAlphabet } from 'nanoid'
import { z } from 'zod'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 7)

export const slugSchema = z
  .string()
  .min(3, '슬러그는 최소 3자 이상이어야 합니다.')
  .max(32, '슬러그는 32자 이하로 입력해 주세요.')
  .regex(/^[a-z0-9-]+$/, '영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.')

export const urlSchema = z
  .string()
  .url('유효한 URL을 입력해 주세요.')
  .refine((value) => /^https?:\/\//i.test(value), 'http 또는 https 프로토콜만 허용됩니다.')

export const generateSlug = () => nanoid()

export const validateSlug = (value: string) => slugSchema.safeParse(value)

export const validateUrl = (value: string) => urlSchema.safeParse(value)

