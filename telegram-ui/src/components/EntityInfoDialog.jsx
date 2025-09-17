import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
const EntityInfoDialog = ({
  open,
  onOpenChange,
  entity,
  onJoin,
  onLeave,
  onEdit,
}) => {
  if (!entity || !entity.data) return null;
  
  const { type, data } = entity;
  const title = type === "group" ? data.name || "Guruh" : data.username || "Foydalanuvchi";
  const subtitle =
    type === "group"
      ? data.description || ""
      : data.firstName && data.lastName
      ? `${data.firstName} ${data.lastName}`
      : data.firstName || "";
  const initial = (
    type === "group"
      ? (data.name || "G")[0]
      : (data.username || data.firstName || "U")[0]
  ).toUpperCase();
  const canLeave = !!data.isMember;
  const canEdit = !!data.isCreator;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ma'lumot</DialogTitle>
        </DialogHeader>
        {}
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-14 h-14">
            {data.avatarUrl ? (
              <AvatarImage src={data.avatarUrl} alt={title} />
            ) : (
              <AvatarFallback className="bg-gray-200 text-gray-700">
                {initial}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-semibold text-lg">{title}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {}
        {type === "group" && (
          <div className="flex gap-2">
            {!data.isMember && (
              <Button className="flex-1" onClick={() => onJoin?.(data.id)}>
                Qo'shilish
              </Button>
            )}
            {canLeave && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onLeave?.(data.id)}
              >
                Chiqish
              </Button>
            )}
            {canEdit && (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => onEdit?.(data.id)}
              >
                Tahrirlash
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default EntityInfoDialog;

