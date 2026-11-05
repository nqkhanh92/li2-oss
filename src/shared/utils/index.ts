import { validate } from 'uuid'

export const separateTag = (tags: string[]) => {
  const existingTags: string[] = []
  const newTags: string[] = []
  tags.map((tag) => {
    if (validate(tag)) {
      existingTags.push(tag)
    } else {
      newTags.push(tag)
    }
  })
  return { existingTags, newTags }
}

export function pickDefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
}

export function pickDefinedAndNotNull<T extends object>(
  obj: T
): Partial<{ [K in keyof T]: NonNullable<T[K]> }> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as Partial<{ [K in keyof T]: NonNullable<T[K]> }>
}
