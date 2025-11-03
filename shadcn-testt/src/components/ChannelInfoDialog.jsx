import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Hash, Trash2 } from "lucide-react";
import ImageUpload from "./ImageUpload";
import { useChannels } from "../hooks/useChannels";
import { storage } from "../utils/storageUtils";
import { useToast } from "../hooks/use-toast";

const ChannelInfoDialog = ({ channelId, isOpen, onClose }) => {
  const {
    getChannelStatus,
    getChannelMembers,
    grantAdmin,
    revokeAdmin,
    updateChannelInfo,
    deleteChannel,
  } = useChannels();

  const [status, setStatus] = useState(null);
  const [members, setMembers] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploadedAvatar, setUploadedAvatar] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const toAbsoluteUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `http://localhost:3000${url}`;
  };

  const load = useCallback(async () => {
    const token = storage.getPersistent("chatToken");
    if (!token || !channelId) return;
    try {
      const data = await getChannelStatus(token, channelId);
      setStatus(data);
      const role = data?.role;
      if (role === "creator" || role === "admin") {
        const m = await getChannelMembers(token, channelId);
        setMembers(m.members || []);
      } else {
        setMembers([]);
      }
    } catch {
      // ignore
    }
  }, [channelId, getChannelStatus, getChannelMembers]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, channelId, load]);

  const channel = status?.group;
  const isCreator = status?.role === "creator";
  const isAdmin = status?.role === "admin";

  useEffect(() => {
    if (channel) {
      setEditedName(channel.name || "");
      setEditedDescription(channel.description || "");
    }
  }, [channel]);

  const handleDeleteChannel = async () => {
    try {
      const token = storage.getPersistent("chatToken");
      await deleteChannel(token, channelId);
      
      // Close the dialog
      onClose();
      
      // Show success message
      toast({
        title: "Kanal o'chirildi",
        description: "Kanal muvaffaqiyatli o'chirildi",
      });
      
      // Dispatch event to update UI
      window.dispatchEvent(new CustomEvent('chat-deleted', {
        detail: {
          chatType: 'channel',
          chatId: channelId,
          deletedBy: 'current_user',
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error.message || "Kanalni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
              <span>Kanal ma'lumotlari</span>
              {(isCreator || isAdmin) && !editMode && (
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => setEditMode(true)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Tahrirlash
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-4">
            <div className="text-center mb-4">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-3 overflow-hidden border-2 ">
                {uploadedAvatar || channel?.avatar ? (
                  <img
                    src={toAbsoluteUrl(uploadedAvatar || channel?.avatar)}
                    alt="Kanal"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <Hash className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{channel?.name}</h2>
              <p className="text-gray-600 dark:text-gray-300">{channel?.description || "Ta'rif yo'q"}</p>
              {editMode && (
                <div className="mt-3">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowImageUpload(true)}
                    className="hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Rasm tanlash
                  </Button>
                </div>
              )}
            </div>

            {(isCreator || isAdmin) && editMode && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Kanal nomi</label>
                  <input 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                    value={editedName} 
                    onChange={(e) => setEditedName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Ta'rif</label>
                  <input 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                    value={editedDescription} 
                    onChange={(e) => setEditedDescription(e.target.value)} 
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 hover:bg-gray-100 dark:hover:bg-gray-700" 
                    variant="outline" 
                    onClick={() => setEditMode(false)}
                  >
                    Bekor qilish
                  </Button>
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white" 
                    onClick={async () => {
                    const token = storage.getPersistent("chatToken");
                    const updates = {
                      name: editedName,
                      description: editedDescription,
                      avatar: uploadedAvatar ?? undefined,
                    };
                    await updateChannelInfo(token, channelId, updates);
                    window.dispatchEvent(new CustomEvent('group-info-updated', { detail: { groupId: channelId, avatar: updates.avatar, updates } }));
                    window.dispatchEvent(new CustomEvent('update-current-chat', { detail: { chatId: channelId, updates } }));
                    setEditMode(false);
                    setUploadedAvatar(null);
                    await load();
                  }}>Saqlash</Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
              <div className="flex items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300">Obunachilar:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{channel?.memberCount || 0}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300">Yaratilgan:</span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {channel?.createdAt
                    ? new Date(channel.createdAt).toLocaleDateString("uz-UZ", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Ma'lumot yo'q"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300">Yaratuvchi:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{channel?.creator?.username || "—"}</span>
              </div>
            </div>

            {(isCreator || isAdmin) && (
              <div className="mt-4">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">A'zolar ({members.length})</h3>
                <div className="space-y-2 max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800/50">
                  {members.map((m) => (
                    <div 
                      key={m.id} 
                      className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={toAbsoluteUrl(m.avatar)}
                            alt=""
                            className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-600"
                            onError={(e) => {
                              e.currentTarget.src = "/default-avatar.png";
                            }}
                          />
                          {m.isOnline && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {m.firstName} {m.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            @{m.username}
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 text-xs rounded-full ${
                          m.role === 'creator' 
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' 
                            : m.role === 'admin' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {m.role === 'creator' ? 'Yaratuvchi' : m.role === 'admin' ? 'Admin' : "A'zo"}
                        </span>
                      </div>
                      {isCreator && m.role !== 'creator' && (
                        <div className="flex gap-2">
                          {m.role === 'member' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={async () => {
                                await grantAdmin(storage.getPersistent('chatToken'), channelId, m.id);
                                const fresh = await getChannelMembers(storage.getPersistent('chatToken'), channelId);
                                setMembers(fresh.members || []);
                              }} 
                              className="text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Admin qilish
                            </Button>
                          )}
                          {m.role === 'admin' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={async () => {
                                await revokeAdmin(storage.getPersistent('chatToken'), channelId, m.id);
                                const fresh = await getChannelMembers(storage.getPersistent('chatToken'), channelId);
                                setMembers(fresh.members || []);
                              }} 
                              className="text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Admin emas
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isCreator && (
              <div className="pt-4 border-t">
                <Button 
                  variant="destructive" 
                  className="w-full flex items-center justify-center gap-2 hover:bg-red-700 dark:hover:bg-red-700"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  Kanalni o'chirish
                </Button>
              </div>
            )}

            {showImageUpload && (
              <ImageUpload
                autoOpen={true}
                onComplete={(imageData) => {
                  const avatarPath = imageData.url?.replace("http://localhost:3000", "") || imageData.url;
                  setUploadedAvatar(avatarPath);
                  setShowImageUpload(false);
                }}
                onCancel={() => setShowImageUpload(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Kanalni o'chirish</DialogTitle>
            <DialogDescription className="text-base text-gray-600 dark:text-gray-300">
              Bu kanalni rostdan ham o'chirmoqchimisiz? Ushbu amalni qaytarib bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Bekor qilish
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteChannel}
              className="hover:bg-red-700 dark:hover:bg-red-700"
            >
              O'chirish
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
};

export default ChannelInfoDialog;