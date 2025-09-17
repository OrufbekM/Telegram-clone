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
  const resetImageUpload = () => {
    console.log('рџ† Emergency reset of image upload');
    setShowImageUpload(false);
    setTimeout(() => {
      setShowImageUpload(true);
    }, 100);
  };
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
  const handleImageUploadComplete = async (imageData) => {
    try {
      const token = storage.getPersistent("chatToken");
      console.log('рџ–јпёЏ Image upload completed:', imageData);
      const avatarPath = imageData.url.replace('http://localhost:3000', '');
      console.log('рџ“Ѓ Avatar path:', avatarPath);
      const response = await updateGroupInfo(token, groupId, { avatar: avatarPath });
      console.log('вњ… Server response:', response);
      setGroupDetails(prev => ({
        ...prev,
        avatar: avatarPath
      }));
      window.dispatchEvent(new CustomEvent('group-info-updated', {
        detail: {
          groupId: groupId,
          avatar: avatarPath,
          updatedBy: 'avatar-change'
        }
      }));
      setUploadedAvatar(null);
      toast({
        title: "Muvaffaqiyat!",
        description: "Guruh rasmi yangilandi",
        variant: "default",
      });
    } catch (error) {
      console.error('вќЊ Error updating group avatar:', error);
      toast({
        title: "Xatolik!",
        description: error.message || "Guruh rasmini yangilashda xatolik",
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
      console.log('рџ”Ќ Fetching group status for groupId:', groupId);
      const statusData = await checkGroupStatus(token, groupId);
      console.log('рџ“‹ Status data received:', statusData);
      if (statusData.group) {
        setGroupDetails(statusData.group);
        setCurrentUserRole(statusData.role);
        const initialOnlineCount = statusData.group.onlineMembersCount || 0;
        setOnlineCount(initialOnlineCount);
        window.dispatchEvent(new CustomEvent('group-online-count-updated', {
          detail: {
            groupId: groupId,
            onlineCount: initialOnlineCount
          }
        }));
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
            window.dispatchEvent(new CustomEvent('group-online-count-updated', {
              detail: {
                groupId: groupId,
                onlineCount: serverOnlineCount
              }
            }));
            console.log('вњ… Members set successfully:', membersData.members.length, 'members');
            console.log('рџ‘Ґ Server online count:', serverOnlineCount);
          } else {
            console.warn('вљ пёЏ No members data in response');
            setMembers([]);
            setOnlineCount(0);
            window.dispatchEvent(new CustomEvent('group-online-count-updated', {
              detail: {
                groupId: groupId,
                onlineCount: 0
              }
            }));
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
          window.dispatchEvent(new CustomEvent('group-online-count-updated', {
            detail: {
              groupId: groupId,
              onlineCount: newOnlineCount
            }
          }));
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span>Guruh ma'lumotlari</span>
              {canManageMembers && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                >
                  {editMode ? "Bekor qilish" : "Tahrirlash"}
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {}
          <div className="space-y-3">
            {editMode ? (
              <>
                {}
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                      {uploadedAvatar || groupDetails?.avatar ? (
                        <img
                          src={
                            uploadedAvatar || toAbsoluteUrl(groupDetails.avatar)
                          }
                          alt="Guruh rasmi"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <Users
                        className="w-10 h-10 text-green-600"
                        style={{
                          display:
                            uploadedAvatar || groupDetails?.avatar
                              ? "none"
                              : "block",
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        console.log('рџ“· Image upload button clicked');
                        if (showImageUpload) {
                          resetImageUpload();
                        } else {
                          setShowImageUpload(true);
                        }
                      }}
                      onDoubleClick={() => {
                        console.log('рџ“· Double-click: Emergency reset');
                        resetImageUpload();
                      }}
                      className="text-xs"
                      title="Click to open, double-click to reset if stuck"
                    >
                      {showImageUpload ? 'Reset' : 'Rasm tanlash'}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="groupName">Guruh nomi</Label>
                  <Input
                    id="groupName"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Guruh nomi"
                  />
                </div>
                <div>
                  <Label htmlFor="groupDescription">Ta'rif</Label>
                  <Input
                    id="groupDescription"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Guruh ta'rifi"
                  />
                </div>
                <Button onClick={handleUpdateGroupInfo} className="w-full">
                  Saqlash
                </Button>
              </>
            ) : (
              <>
                {}
                <div className="text-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                    {uploadedAvatar || groupDetails?.avatar ? (
                      <img
                        src={
                          uploadedAvatar || toAbsoluteUrl(groupDetails.avatar)
                        }
                        alt="Guruh rasmi"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <Users
                      className="w-10 h-10 text-green-600"
                      style={{
                        display:
                          uploadedAvatar || groupDetails?.avatar
                            ? "none"
                            : "block",
                      }}
                    />
                  </div>
                </div>
                <h2 className="text-2xl font-bold">{groupDetails?.name}</h2>
                <p className="text-gray-600">
                  {groupDetails?.description || "Ta'rif yo'q"}
                </p>
              </>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Jami a'zolar:</span>
                <span className="ml-2">{groupDetails?.memberCount || 0}</span>
              </div>
              <div>
                <span className="font-medium">Onlayn:</span>
                <span className="ml-2 text-green-600">{onlineCount}</span>
              </div>
              <div>
                <span className="font-medium">Yaratilgan:</span>
                <span className="ml-2">
                  {groupDetails?.createdAt
                    ? new Date(groupDetails.createdAt).toLocaleDateString(
                        "uz-UZ",
                        {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                        }
                      )
                    : "Ma'lumot yo'q"}
                </span>
              </div>
              <div>
                <span className="font-medium">Yaratuvchi:</span>
                <span className="ml-2">{groupDetails?.creator?.username}</span>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold mb-3 flex items-center justify-between">
              <span>A'zolar ({members.length})</span>
              <span className="text-sm text-gray-500">
                Onlayn: {onlineCount}
              </span>
            </h3>
            <ScrollArea className="h-48 w-full border rounded-md p-4">
              <div className="space-y-3">
                {members
                  .sort((a, b) => {
                    const roleOrder = { creator: 0, admin: 1, member: 2 };
                    return roleOrder[a.role] - roleOrder[b.role];
                  })
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img
                            src={
                              toAbsoluteUrl(member.avatar) ||
                              "/api/placeholder/32/32"
                            }
                            alt=""
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              e.target.src = "/api/placeholder/32/32";
                            }}
                          />
                          {member.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {member.firstName} {member.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{member.username}
                          </div>
                        </div>
                        <div className="ml-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              member.role === "creator"
                                ? "bg-purple-100 text-purple-800"
                                : member.role === "admin"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {member.role === "creator"
                              ? "Yaratuvchi"
                              : member.role === "admin"
                              ? "Admin"
                              : "A'zo"}
                          </span>
                        </div>
                      </div>
                      {canManageMembers &&
                        member.id !== currentUser?.id &&
                        member.role !== "creator" && (
                          <div className="flex space-x-1">
                            {member.role === "member" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePromoteToAdmin(member.id)}
                                className="text-xs"
                              >
                                Admin qilish
                              </Button>
                            )}
                            {member.role === "admin" && isCreator && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDemoteFromAdmin(member.id)}
                                className="text-xs"
                              >
                                Admin emas
                              </Button>
                            )}
                            {(member.role === "member" ||
                              (member.role === "admin" && isCreator)) && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-xs"
                              >
                                Chiqarish
                              </Button>
                            )}
                          </div>
                        )}
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
      {showImageUpload && (
        <ImageUpload
          autoOpen={true}
          onComplete={handleImageUploadComplete}
          onCancel={() => {
            console.log('рџ”ґ ImageUpload cancelled');
            setShowImageUpload(false);
          }}
        />
      )}
      {memberToRemove && (
        <Dialog open={true} onOpenChange={() => setMemberToRemove(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>A'zoni guruhdan chiqarish</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                <span className="font-medium">{memberToRemove.username}</span>{" "}
                foydalanuvchisini guruhdan chiqarishni xohlaysizmi?
              </p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setMemberToRemove(null)}
                >
                  Bekor qilish
                </Button>
                <Button variant="destructive" onClick={confirmRemoveMember}>
                  Ha, chiqarish
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
export default GroupInfoDialog;

