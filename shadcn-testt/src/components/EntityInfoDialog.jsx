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
  const title =
    type === "group" || type === "channel"
      ? data.name || (type === "group" ? "Guruh" : "Kanal")
      : data.username || "Foydalanuvchi";
  const subtitle =
    type === "group" || type === "channel"
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
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <DialogHeader className="text-gray-900 dark:text-white">
          <DialogTitle>Ma'lumot</DialogTitle>
        </DialogHeader>
        {}
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-14 h-14">
            {data.avatarUrl ? (
              <AvatarImage src={data.avatarUrl} alt={title} />
            ) : (
              <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                {initial}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-semibold text-lg text-gray-900 dark:text-white">{title}</p>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {}
        {(type === "group" || type === "channel") && (
          <div className="flex gap-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            {!data.isMember && (
              <Button className="flex-1" onClick={() => onJoin?.(data.id)}>
                {type === "channel" ? "Obuna bo'lish" : "Qo'shilish"}
              </Button>
            )}
            {canLeave && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onLeave?.(data.id)}
              >
                {type === "channel" ? "Chiqish" : "Chiqish"}
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
        {type === "channel" && (
          <div className="mt-3 text-sm text-gray-600">
            <div>
              <span className="font-medium">Obunachilar:</span>
              <span className="ml-2">{data.memberCount || 0}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default EntityInfoDialog;

