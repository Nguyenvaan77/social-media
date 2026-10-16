import { createDemoState } from './seed'
import type { CmsDataState } from './types'

export const CMS_STORAGE_KEY = 'diemden-cms-demo-v1'
export const CMS_DATA_VERSION = 1

type RecordValue = Record<string, unknown>
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const isOptionalString = (value: unknown): boolean =>
  value === undefined || isString(value)
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString)
const isOneOf = (value: unknown, options: readonly string[]): boolean =>
  isString(value) && options.includes(value)

const roles = ['user', 'area_manager', 'admin'] as const
const locationStatuses = ['draft', 'pending', 'published', 'rejected', 'archived'] as const
const campaignStatuses = ['draft', 'pending', 'scheduled', 'active', 'paused', 'completed', 'rejected'] as const
const reviewStatuses = ['pending', 'approved', 'rejected'] as const

const validUser = (item: unknown): boolean =>
  isRecord(item) &&
  ['id', 'name', 'email', 'phone', 'organization', 'joinedAt', 'lastActiveAt'].every(
    (key) => isString(item[key]),
  ) &&
  isOneOf(item.role, roles) &&
  isOneOf(item.status, ['active', 'suspended']) &&
  isOptionalString(item.avatarUrl) &&
  (item.permissions === undefined || isStringArray(item.permissions))

const validLocation = (item: unknown): boolean =>
  isRecord(item) &&
  [
    'id', 'name', 'category', 'address', 'district', 'city', 'description',
    'ownerId', 'createdAt', 'updatedAt',
  ].every((key) => isString(item[key])) &&
  ['latitude', 'longitude', 'views'].every((key) => isNumber(item[key])) &&
  isOneOf(item.status, locationStatuses) &&
  ['managerId', 'imageUrl', 'openingHours'].every((key) => isOptionalString(item[key]))

const validCampaign = (item: unknown): boolean =>
  isRecord(item) &&
  [
    'id', 'name', 'description', 'ownerId', 'startDate', 'endDate',
    'creativeTitle', 'creativeBody', 'createdAt', 'updatedAt',
  ].every((key) => isString(item[key])) &&
  ['budget', 'spent', 'impressions', 'clicks'].every((key) => isNumber(item[key])) &&
  isOneOf(item.status, campaignStatuses) &&
  isStringArray(item.locationIds) &&
  (item.kioskIds === undefined || isStringArray(item.kioskIds)) &&
  ['zone', 'mediaFileName'].every((key) => isOptionalString(item[key])) &&
  (item.frequency === undefined || isNumber(item.frequency)) &&
  (item.mediaType === undefined || isOneOf(item.mediaType, ['video', 'image', 'interactive']))

const validReviewFields = (item: RecordValue): boolean =>
  isOneOf(item.status, reviewStatuses) &&
  ['reviewedAt', 'reviewerId', 'reviewNote'].every((key) => isOptionalString(item[key]))

const validKioskRequest = (item: unknown): boolean =>
  isRecord(item) &&
  ['id', 'title', 'locationId', 'requesterId', 'message', 'submittedAt'].every(
    (key) => isString(item[key]),
  ) &&
  isOptionalString(item.campaignId) &&
  isNumber(item.durationDays) &&
  validReviewFields(item)

const validModeration = (item: unknown): boolean =>
  isRecord(item) &&
  ['id', 'locationId', 'submitterId', 'title', 'note', 'submittedAt'].every(
    (key) => isString(item[key]),
  ) &&
  validReviewFields(item)

export function isCmsDataState(value: unknown): value is CmsDataState {
  if (!isRecord(value) || !isString(value.currentUserId)) return false
  const collections = [
    ['users', validUser],
    ['locations', validLocation],
    ['campaigns', validCampaign],
    ['kioskRequests', validKioskRequest],
    ['moderationItems', validModeration],
  ] as const
  if (!collections.every(([key, validator]) =>
    Array.isArray(value[key]) && value[key].every(validator)
  )) return false

  const users = value.users as RecordValue[]
  if (!users.some((user) => user.id === value.currentUserId)) return false

  // A malformed collection should never leak into the UI after a refresh.
  return collections.every(([key]) => {
    const ids = (value[key] as RecordValue[]).map((item) => item.id)
    return new Set(ids).size === ids.length
  })
}

export function loadCmsData(): CmsDataState {
  if (typeof window === 'undefined') return createDemoState()
  try {
    const raw = window.localStorage.getItem(CMS_STORAGE_KEY)
    if (!raw) return createDemoState()
    const stored: unknown = JSON.parse(raw)
    if (
      isRecord(stored) &&
      stored.version === CMS_DATA_VERSION &&
      isCmsDataState(stored.data)
    ) return stored.data
  } catch {
    // Browser storage can be disabled or contain partial JSON.
  }
  return createDemoState()
}

export function saveCmsData(data: CmsDataState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      CMS_STORAGE_KEY,
      JSON.stringify({ version: CMS_DATA_VERSION, data }),
    )
  } catch {
    // The in-memory demo remains usable when storage is unavailable or full.
  }
}
