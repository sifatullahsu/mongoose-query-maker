import { TPagination } from '../types'

export const pagination: TPagination = q => {
  if (Array.isArray(q.page)) throw new Error('Multiple `page` found.')
  if (Array.isArray(q.limit)) throw new Error('Multiple `limit` found.')
  if (Array.isArray(q.sort)) throw new Error('Multiple `sort` found.')

  let page = parseInt(q.page as string, 10) ?? 1
  let limit = parseInt(q.limit as string, 10) ?? 10

  page = Math.max(1, isNaN(page) ? 1 : page)
  limit = Math.max(1, isNaN(limit) ? 10 : limit)

  const skip = (page - 1) * limit
  const sort = q.sort ? (q.sort as string).replace(/,/g, ' ') : 'createdAt'

  return { page, limit, skip, sort }
}
