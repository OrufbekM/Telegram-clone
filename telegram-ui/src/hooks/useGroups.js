import { useState } from 'react'
import apiClient from '../../services/api-Client'
export const useGroups = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const handleError = (err, fallbackMessage) => {
    const message = typeof err === 'string' ? err : err?.message || fallbackMessage
    setError(message)
    throw new Error(message)
  }
  const createGroup = async (token, groupData) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/groups', groupData)
      return data
    } catch (err) {
      return handleError(err, 'Failed to create group')
    } finally {
      setIsLoading(false)
    }
  }
  const getUserGroups = async (token) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get('/groups/user')
      return data
    } catch (error) {
      return handleError(error, 'Failed to fetch groups')
    } finally {
      setIsLoading(false)
    }
  }
  const getGroupDetails = async (token, groupId) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get(`/groups/${groupId}`)
      return data
    } catch (error) {
      return handleError(error, 'Failed to fetch group details')
    } finally {
      setIsLoading(false)
    }
  }
  const addGroupMember = async (token, groupId, userId, role = 'member') => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/groups/members', { groupId, userId, role })
      return data
    } catch (error) {
      return handleError(error, 'Failed to add member')
    } finally {
      setIsLoading(false)
    }
  }
  const checkGroupStatus = async (token, groupId) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get(`/groups/${groupId}/status`)
      return data
    } catch (error) {
      return handleError(error, 'Failed to check group status')
    } finally {
      setIsLoading(false)
    }
  }
  const joinGroup = async (token, groupId) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/groups/join', { groupId })
      return data
    } catch (error) {
      return handleError(error, 'Failed to join group')
    } finally {
      setIsLoading(false)
    }
  }
  const leaveGroup = async (token, groupId, deleteForEveryone = false) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.delete(`/groups/${groupId}/leave`, {
        data: { deleteForEveryone }
      })
      return data
    } catch (error) {
      return handleError(error, 'Failed to leave group')
    } finally {
      setIsLoading(false)
    }
  }
  const getGroupMembers = async (token, groupId) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get(`/groups/${groupId}/members`)
      return data
    } catch (error) {
      return handleError(error, 'Failed to fetch group members')
    } finally {
      setIsLoading(false)
    }
  }
  const updateGroupInfo = async (token, groupId, updateData) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.put(`/groups/${groupId}/info`, updateData)
      return data
    } catch (error) {
      return handleError(error, 'Failed to update group info')
    } finally {
      setIsLoading(false)
    }
  }
  const promoteToAdmin = async (token, groupId, userId) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/groups/promote', { groupId, userId })
      return data
    } catch (error) {
      return handleError(error, 'Failed to promote member')
    } finally {
      setIsLoading(false)
    }
  }
  const demoteFromAdmin = async (token, groupId, userId) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/groups/demote', { groupId, userId })
      return data
    } catch (error) {
      return handleError(error, 'Failed to demote member')
    } finally {
      setIsLoading(false)
    }
  }
  const removeMember = async (token, groupId, userId) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/groups/remove', { groupId, userId })
      return data
    } catch (error) {
      return handleError(error, 'Failed to remove member')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteGroup = async (token, groupId) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.delete(`/groups/${groupId}`)
      return data
    } catch (error) {
      return handleError(error, 'Failed to delete group')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createGroup,
    getUserGroups,
    getGroupDetails,
    addGroupMember,
    checkGroupStatus,
    joinGroup,
    leaveGroup,
    getGroupMembers,
    updateGroupInfo,
    promoteToAdmin,
    demoteFromAdmin,
    removeMember,
    deleteGroup,
    isLoading,
    error
  }
}

