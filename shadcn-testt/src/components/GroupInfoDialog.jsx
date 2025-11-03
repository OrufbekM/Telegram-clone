import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Users } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { useAuth } from "../hooks/useAuth";
import { useGroups } from "../hooks/useGroups";
import { useToast } from "../hooks/use-toast";
import ImageUpload from "./ImageUpload";
import { storage } from "../utils/storageUtils";
const GroupInfoDialog = ({ groupId, onClose, isOpen }) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const {
    checkGroupStatus,
    getGroupMembers,
    updateGroupInfo,
    promoteToAdmin,
    demoteFromAdmin,
    removeMember,
    isLoading
  } = useGroups();
  const [loading, setLoading] = useState(true);
  const [groupDetails, setGroupDetails] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [showImageUpload, setShowImageUpload] = useState(false);
  useEffect(() => {
    console.log('рџ–јпёЏ GroupInfoDialog showImageUpload state changed:', showImageUpload);
  }, [showImageUpload]);
  useEffect(() => {
    if (!isOpen || !editMode) {
      console.log('рџ”„ Resetting image upload state');
      setShowImageUpload(false);
    }
  }, [isOpen, editMode]);
  const [uploadedAvatar, setUploadedAvatar] = useState(null);
  const handleUpdateGroupInfo = async () => {
    const token = storage.getPersistent("chatToken");
    const updateData = {
      name: editedName,
      description: editedDescription
    };
    if (uploadedAvatar) {
      updateData.avatar = uploadedAvatar;
    }
    try {
      await updateGroupInfo(token, groupId, updateData);
      setGroupDetails(prev => ({
        ...prev,
        ...updateData
      }));
      setEditMode(false);
      setUploadedAvatar(null);
      toast({
        title: "Muvaffaqiyat!",
        description: "Guruh ma'lumotlari yangilandi",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: "Guruh ma'lumotlarini yangilashda xatolik",
        variant: "destructive",
      });
    }
  };


  const handlePromoteToAdmin = async (userId) => {
    const token = storage.getPersistent("chatToken");
    try {
      await promoteToAdmin(token, groupId, userId);
      setMembers(prev => prev.map(member =>
        member.id === userId ? { ...member, role: 'admin' } : member
      ));
      toast({
        title: "Muvaffaqiyat!",
        description: "Foydalanuvchi admin qilindi",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: "Foydalanuvchini admin qilishda xatolik",
        variant: "destructive",
      });
    }
  };
  const handleDemoteFromAdmin = async (userId) => {
    const token = storage.getPersistent("chatToken");
    try {
      await demoteFromAdmin(token, groupId, userId);
      setMembers(prev => prev.map(member =>
        member.id === userId ? { ...member, role: 'member' } : member
      ));
      toast({
        title: "Muvaffaqiyat!",
        description: "Admin huquqi olib qoyildi",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: "Admin huquqini olib qoyishda xatolik",
        variant: "destructive",
      });
    }
  };
  const [memberToRemove, setMemberToRemove] = useState(null);
  const toAbsoluteUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `http://localhost:3000${url}`;
  };
  const fetchGroupData = async () => {
    if (!groupId) return;
    setLoading(true);
    const token = storage.getPersistent("chatToken");
    try {
      console.log(' Fetching group status for groupId:', groupId);
      const statusData = await checkGroupStatus(token, groupId);
      console.log('рџ“‹ Status data received:', statusData);
      if (statusData.group) {
        setGroupDetails(statusData.group);
        setCurrentUserRole(statusData.role);
        const initialOnlineCount = statusData.group.onlineMembersCount || 0;
        setOnlineCount(initialOnlineCount);
        try {
          window.dispatchEvent(new CustomEvent('group-online-count-updated', { detail: { groupId, onlineCount: initialOnlineCount } }));
        } catch { }
        console.log('вњ… Group details set:', statusData.group);
        console.log('рџЋ­ User role:', statusData.role);
        console.log('рџ‘Ґ Initial online count:', initialOnlineCount);
      }
      if (statusData.isMember) {
        console.log('вњ… User is a member, fetching members list...');
        try {
          console.log('рџ”Ќ Fetching members for groupId:', groupId);
          const membersData = await getGroupMembers(token, groupId);
          console.log('рџ‘Ґ Members data received:', membersData);
          console.log('рџ‘Ґ Members array length:', membersData.members?.length || 0);
          console.log('рџ‘Ґ Members array:', membersData.members);
          console.log('рџ“Љ Online members count:', membersData.onlineMembers);
          console.log('рџ“Љ Total members count:', membersData.totalMembers);
          if (membersData && membersData.members) {
            console.log('вњ… Setting members state with', membersData.members.length, 'members');
            setMembers(membersData.members);
            const serverOnlineCount = membersData.onlineMembers || 0;
            console.log('рџџў Setting online count to:', serverOnlineCount);
            setOnlineCount(serverOnlineCount);
            try {
              window.dispatchEvent(new CustomEvent('group-online-count-updated', { detail: { groupId, onlineCount: serverOnlineCount } }));
            } catch { }
            console.log('вњ… Members set successfully:', membersData.members.length, 'members');
            console.log('рџ‘Ґ Server online count:', serverOnlineCount);
          } else {
            console.warn('вљ пёЏ No members data in response');
            setMembers([]);
            setOnlineCount(0);
          }
        } catch (membersError) {
          console.error('вќЊ Error fetching members:', membersError);
          setMembers([]);
          setOnlineCount(0);
        }
      } else {
        console.log('вќЊ User is not a member');
        setMembers([]);
        setOnlineCount(0);
      }
    } catch (error) {
      console.error("Error fetching group data:", error);
      toast({
        title: "Xatolik!",
        description: "Guruh ma'lumotlarini yuklashda xatolik",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isOpen && groupId) {
      fetchGroupData();
    }
  }, [isOpen, groupId]);
  useEffect(() => {
    if (!isOpen || !groupId) return;
    const handleMemberPromoted = (event) => {
      const data = event.detail;
      if (data.data.groupId == groupId) {
        setMembers(prev => prev.map(member =>
          member.id === data.data.userId
            ? { ...member, role: data.data.newRole }
            : member
        ));
      }
    };
    const handleMemberDemoted = (event) => {
      const data = event.detail;
      if (data.data.groupId == groupId) {
        setMembers(prev => prev.map(member =>
          member.id === data.data.userId
            ? { ...member, role: data.data.newRole }
            : member
        ));
      }
    };
    const handleMemberRemoved = (event) => {
      const data = event.detail;
      if (data.data.groupId == groupId) {
        setMembers(prev => prev.filter(member => member.id !== data.data.userId));
        setGroupDetails(prev => prev ? {
          ...prev,
          memberCount: Math.max(0, prev.memberCount - 1)
        } : prev);
      }
    };
    const handleGroupInfoUpdated = (event) => {
      const data = event.detail;
      if (data.data.groupId == groupId) {
        setGroupDetails(prev => prev ? {
          ...prev,
          ...data.data.updates
        } : prev);
      }
    };
    const handleUserStatusUpdate = (event) => {
      const data = event.detail;
      if (data.data.userId) {
        setMembers(prev => prev.map(member =>
          member.id === data.data.userId
            ? {
              ...member,
              isOnline: data.data.isOnline,
              lastSeen: data.data.lastSeen
            }
            : member
        ));
        setOnlineCount(prev => {
          const updatedMembers = members.map(member =>
            member.id === data.data.userId
              ? { ...member, isOnline: data.data.isOnline }
              : member
          );
          const newOnlineCount = updatedMembers.filter(member => member.isOnline).length;
          return newOnlineCount;
        });
      }
    };
    window.addEventListener('memberPromoted', handleMemberPromoted);
    window.addEventListener('memberDemoted', handleMemberDemoted);
    window.addEventListener('memberRemoved', handleMemberRemoved);
    window.addEventListener('groupInfoUpdated', handleGroupInfoUpdated);
    window.addEventListener('userStatusUpdate', handleUserStatusUpdate);
    return () => {
      window.removeEventListener('memberPromoted', handleMemberPromoted);
      window.removeEventListener('memberDemoted', handleMemberDemoted);
      window.removeEventListener('memberRemoved', handleMemberRemoved);
      window.removeEventListener('groupInfoUpdated', handleGroupInfoUpdated);
      window.removeEventListener('userStatusUpdate', handleUserStatusUpdate);
    };
  }, [isOpen, groupId, members]);
  useEffect(() => {
    if (groupDetails) {
      setEditedName(groupDetails.name || "");
      setEditedDescription(groupDetails.description || "");
    }
  }, [groupDetails]);
  const handleRemoveMember = async (userId) => {
    const targetMember = members.find(m => m.id === userId);
    if (!targetMember) return;
    setMemberToRemove(targetMember);
  };
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    const token = storage.getPersistent("chatToken");
    try {
      await removeMember(token, groupId, memberToRemove.id);
      setMembers(prev => prev.filter(member => member.id !== memberToRemove.id));
      setGroupDetails(prev => ({
        ...prev,
        memberCount: prev.memberCount - 1
      }));
      toast({
        title: "Muvaffaqiyat!",
        description: "Foydalanuvchi guruhdan chiqarildi",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: "Foydalanuvchini chiqarishda xatolik",
        variant: "destructive",
      });
    } finally {
      setMemberToRemove(null);
    }
  };
  const canManageMembers = currentUserRole === 'admin' || currentUserRole === 'creator';
  const isCreator = currentUserRole === 'creator';
  if (!isOpen || !groupId) return null;
  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Yuklanmoqda...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  if (!groupDetails) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Xatolik</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center text-red-600">
            Guruh ma'lumotlari topilmadi
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between text-gray-900 dark:text-white">
            <div className="flex items-center space-x-3">
              <span>Guruh ma'lumotlari</span>
              {canManageMembers && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {editMode ? 'Bekor qilish' : 'Tahrirlash'}
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* Group Info Section */}
          <div className="flex items-start space-x-4">
            <div className="relative group">
              <img
                src={groupDetails.avatar ? toAbsoluteUrl(groupDetails.avatar) : '/default-group.png'}
                alt={groupDetails.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => editMode && setShowImageUpload(true)}
              />
              {editMode && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm">O'zgartirish</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="groupName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Guruh nomi
                    </Label>
                    <Input
                      id="groupName"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="groupDescription" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tavsif (ixtiyoriy)
                    </Label>
                    <Input
                      id="groupDescription"
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={handleUpdateGroupInfo}
                      disabled={!editedName.trim()}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                    >
                      Saqlash
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(false)}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Bekor qilish
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {groupDetails.name}
                  </h2>
                  {groupDetails.description && (
                    <p className="text-gray-600 dark:text-gray-300">
                      {groupDetails.description}
                    </p>
                  )}
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{groupDetails.memberCount || members.length} a'zo • {onlineCount} onlayn</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Members List */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">A'zolar</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img
                        src={member.avatar ? toAbsoluteUrl(member.avatar) : '/default-avatar.png'}
                        alt={member.username}
                        className="w-10 h-10 rounded-full"
                      />
                      {member.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{member.username}
                        {member.role === 'creator' && ' • Asoschi'}
                        {member.role === 'admin' && ' • Admin'}
                      </p>
                    </div>
                  </div>

                  {canManageMembers && member.role !== 'creator' && (
                    <div className="flex space-x-2">
                      {member.role === 'admin' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDemoteFromAdmin(member.id)}
                          className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Adminlikdan olib tashlash
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePromoteToAdmin(member.id)}
                          className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Admin qilish
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                      >
                        Chiqarib yuborish
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupInfoDialog;
