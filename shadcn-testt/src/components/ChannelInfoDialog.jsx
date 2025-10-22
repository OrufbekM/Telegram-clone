import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Hash, Trash2 } from "lucide-react";
import ImageUpload from "./ImageUpload";
import { useChannels } from "../hooks/useChannels";
import { storage } from "../utils/storageUtils";
import { useToast } from "../hooks/use-toast";
import ConfirmDialog from "./ConfirmDialog";

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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <span>Kanal ma'lumotlari</span>
              {(isCreator || isAdmin) && !editMode && (
                <Button size="sm" variant="secondary" onClick={() => setEditMode(true)}>
                  Tahrirlash
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2 overflow-hidden">
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
                  <Hash className="w-10 h-10 text-purple-600" />
                )}
              </div>
              <h2 className="text-2xl font-bold">{channel?.name}</h2>
              <p className="text-gray-600">{channel?.description || "Ta'rif yo'q"}</p>
              {editMode && (
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => setShowImageUpload(true)}>
                    Rasm tanlash
                  </Button>
                </div>
              )}
            </div>

            {(isCreator || isAdmin) && editMode && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Kanal nomi</label>
                  <input className="w-full border rounded px-3 py-2" value={editedName} onChange={(e) => setEditedName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ta'rif</label>
                  <input className="w-full border rounded px-3 py-2" value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" variant="outline" onClick={() => setEditMode(false)}>Bekor qilish</Button>
                  <Button className="flex-1" onClick={async () => {
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

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Obunachilar:</span>
                <span className="ml-2">{channel?.memberCount || 0}</span>
              </div>
              <div>
                <span className="font-medium">Yaratilgan:</span>
                <span className="ml-2">
                  {channel?.createdAt
                    ? new Date(channel.createdAt).toLocaleDateString("uz-UZ", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                      })
                    : "Ma'lumot yo'q"}
                </span>
              </div>
              <div>
                <span className="font-medium">Yaratuvchi:</span>
                <span className="ml-2">{channel?.creator?.username || "—"}</span>
              </div>
            </div>

            {(isCreator || isAdmin) && (
              <div>
                <h3 className="font-semibold mb-2">A'zolar ({members.length})</h3>
                <div className="space-y-2 max-h-56 overflow-y-auto border rounded p-3">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <img
                          src={toAbsoluteUrl(m.avatar)}
                          alt=""
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            e.currentTarget.src = "/api/placeholder/32/32";
                          }}
                        />
                        <div>
                          <div className="font-medium">{m.firstName} {m.lastName}</div>
                          <div className="text-sm text-gray-500">@{m.username}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${m.role === 'creator' ? 'bg-purple-100 text-purple-800' : m.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {m.role === 'creator' ? 'Yaratuvchi' : m.role === 'admin' ? 'Admin' : "A'zo"}
                        </span>
                      </div>
                      {isCreator && m.role !== 'creator' && (
                        <div className="flex gap-2">
                          {m.role === 'member' && (
                            <Button size="sm" variant="outline" onClick={async () => {
                              await grantAdmin(storage.getPersistent('chatToken'), channelId, m.id);
                              const fresh = await getChannelMembers(storage.getPersistent('chatToken'), channelId);
                              setMembers(fresh.members || []);
                            }} className="text-xs">Admin qilish</Button>
                          )}
                          {m.role === 'admin' && (
                            <Button size="sm" variant="outline" onClick={async () => {
                              await revokeAdmin(storage.getPersistent('chatToken'), channelId, m.id);
                              const fresh = await getChannelMembers(storage.getPersistent('chatToken'), channelId);
                              setMembers(fresh.members || []);
                            }} className="text-xs">Admin emas</Button>
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
                  className="w-full flex items-center justify-center gap-2"
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

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Kanalni o'chirish"
        description="Haqiqatan ham bu kanalni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi va barcha xabarlar o'chiriladi."
        confirmText="O'chirish"
        cancelText="Bekor qilish"
        variant="destructive"
        onConfirm={handleDeleteChannel}
      />
    </>
  );
};

export default ChannelInfoDialog;