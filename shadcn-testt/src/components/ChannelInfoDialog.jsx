import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useChannels } from "../hooks/useChannels";
import { storage } from "../utils/storageUtils";

const ChannelInfoDialog = ({ channelId, isOpen, onClose }) => {
  const { getChannelStatus, joinChannel, leaveChannel } = useChannels();
  const [status, setStatus] = useState(null);
  const load = useCallback(async () => {
    const token = storage.getPersistent("chatToken");
    if (!token || !channelId) return;
    try {
      const data = await getChannelStatus(token, channelId);
      setStatus(data);
    } catch {
      // ignore
    }
  }, [channelId, getChannelStatus]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, channelId, load]);

  if (!isOpen) return null;
  const canWrite = status?.role === "creator" || status?.role === "admin";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kanal ma'lumotlari</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="text-lg font-semibold">{status?.group?.name}</div>
            <div className="text-gray-600">{status?.group?.description}</div>
            <div className="text-sm text-gray-500 mt-1">
              {status?.group?.memberCount || 0} a'zo
            </div>
            <div className="text-sm mt-1">
              Yozish huquqi: {canWrite ? "Ha (creator/admin)" : "Yo'q"}
            </div>
          </div>
          <div className="flex gap-2">
            {!status?.isMember && (
              <Button onClick={async () => { await joinChannel(storage.getPersistent("chatToken"), channelId); load(); }}>Kanalga qo'shilish</Button>
            )}
            {status?.isMember && (
              <Button variant="outline" onClick={async () => { await leaveChannel(storage.getPersistent("chatToken"), channelId); onClose(); }}>Chiqish</Button>
            )}
          </div>
          <ScrollArea className="h-48 w-full border rounded-md p-4">
            <div className="text-sm text-gray-500">A'zolar ro'yxati keyin to'ldiriladi.</div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelInfoDialog;


