export type Tag = {
  id: string
  slug: string
  label: string
  category: string
  description: string | null
}

export type GetTagsParams = {
  category?: string
}
