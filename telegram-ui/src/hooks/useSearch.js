import { useState } from 'react'
import apiClient from '../../services/api-Client'
export const useSearch = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const handleError = (err, fallbackMessage) => {
    const message = typeof err === 'string' ? err : err?.message || fallbackMessage
    setError(message)
    throw new Error(message)
  }
  const universalSearch = async (token, query, type = 'all') => {
    try {
      let apiType = type
      if (type === 'groups') {
        apiType = 'groups_only'
      } else if (type === 'channels') {
        apiType = 'channels'
      }
      const { data } = await apiClient.get('/search', {
        params: { query, type: apiType }
      })
      if (!data.results) {
        return { results: { users: [], groups: [] } }
      }
      return data
    } catch (err) {
      try {
        return await fallbackSearch(token, query, type)
      } catch (fallbackErr) {
        return handleError(err, 'Qidiruvda xatolik')
      }
    }
  }
  const fallbackSearch = async (token, query, type) => {
    try {
      const results = { users: [], groups: [] }
      if (type === 'all' || type === 'users') {
        try {
          const { data: userData } = await apiClient.get('/users/search', {
            params: { query }
          })
          results.users = userData.users || []
        } catch (err) {}
      }
      if (type === 'all' || type === 'groups' || type === 'channels') {
        try {
          const { data: groupData } = await apiClient.get('/groups/user')
          const allGroups = groupData.groups || []
          results.groups = allGroups.filter(group => {
            const matchesQuery = group.name.toLowerCase().includes(query.toLowerCase()) ||
                               (group.description && group.description.toLowerCase().includes(query.toLowerCase()))
            if (type === 'groups') return matchesQuery && group.type === 'group'
            if (type === 'channels') return matchesQuery && group.type === 'channel'
            return matchesQuery
          })
        } catch (err) {}
      }
      return { results }
    } catch (err) {
      throw err
    }
  }
  const advancedSearch = async (token, query, type, filters = {}) => {
    try {
      const { data } = await apiClient.get('/search/advanced', {
        params: { query, type, ...filters }
      })
      return data
    } catch (err) {
      return handleError(err, 'Advanced qidiruvda xatolik')
    }
  }
  return {
    universalSearch,
    advancedSearch,
    isLoading,
    error
  }
}

