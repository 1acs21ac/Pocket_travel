export interface MoodProfile {
  tags: string[]
  updatedAt?: string
}

export const defaultMoodProfile: MoodProfile = {
  tags: []
}
