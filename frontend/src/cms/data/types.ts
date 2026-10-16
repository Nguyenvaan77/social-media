export type CmsRole = 'user' | 'area_manager' | 'admin'

export type LocationStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'rejected'
  | 'archived'

export type CampaignStatus =
  | 'draft'
  | 'pending'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'rejected'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'
export type UserStatus = 'active' | 'suspended'

export interface CmsUser {
  id: string
  name: string
  email: string
  phone: string
  role: CmsRole
  status: UserStatus
  organization: string
  avatarUrl?: string
  permissions?: string[]
  joinedAt: string
  lastActiveAt: string
}

export interface Location {
  id: string
  name: string
  category: string
  address: string
  district: string
  city: string
  description: string
  latitude: number
  longitude: number
  status: LocationStatus
  ownerId: string
  managerId?: string
  imageUrl?: string
  openingHours?: string
  views: number
  createdAt: string
  updatedAt: string
}

export interface KioskCampaign {
  id: string
  name: string
  description: string
  status: CampaignStatus
  ownerId: string
  locationIds: string[]
  startDate: string
  endDate: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  creativeTitle: string
  creativeBody: string
  kioskIds?: string[]
  zone?: string
  frequency?: number
  mediaType?: 'video' | 'image' | 'interactive'
  mediaFileName?: string
  createdAt: string
  updatedAt: string
}

export interface KioskRequest {
  id: string
  title: string
  locationId: string
  campaignId?: string
  requesterId: string
  message: string
  durationDays: number
  status: ReviewStatus
  submittedAt: string
  reviewedAt?: string
  reviewerId?: string
  reviewNote?: string
}

export interface LocationModeration {
  id: string
  locationId: string
  submitterId: string
  title: string
  note: string
  status: ReviewStatus
  submittedAt: string
  reviewedAt?: string
  reviewerId?: string
  reviewNote?: string
}

export interface CmsDataState {
  currentUserId: string
  users: CmsUser[]
  locations: Location[]
  campaigns: KioskCampaign[]
  kioskRequests: KioskRequest[]
  moderationItems: LocationModeration[]
}

export type CreateUserInput = Pick<CmsUser, 'name' | 'email' | 'role'> &
  Partial<Omit<CmsUser, 'id' | 'name' | 'email' | 'role' | 'joinedAt' | 'lastActiveAt'>>

export type CreateLocationInput = Pick<Location, 'name' | 'address'> &
  Partial<Omit<Location, 'id' | 'name' | 'address' | 'createdAt' | 'updatedAt'>>

export type CreateCampaignInput = Pick<KioskCampaign, 'name'> &
  Partial<Omit<KioskCampaign, 'id' | 'name' | 'createdAt' | 'updatedAt'>>

export type CreateKioskRequestInput = Pick<KioskRequest, 'title' | 'locationId'> &
  Partial<Omit<KioskRequest, 'id' | 'title' | 'locationId' | 'submittedAt' | 'reviewedAt'>>

export type CreateModerationInput = Pick<LocationModeration, 'locationId'> &
  Partial<Omit<LocationModeration, 'id' | 'locationId' | 'submittedAt' | 'reviewedAt'>>
