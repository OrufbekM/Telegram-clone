import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
const API_URL = "http://localhost:3000";
const toAbsoluteUrl = (url) =>
  url?.startsWith("http") ? url : `${API_URL}${url || ""}`;
const UserInfoDialog = ({ open, onOpenChange, user }) => {
  if (!user) return null;
  const initial = (user.username || "U")[0].toUpperCase();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Foydalanuvchi</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="w-12 h-12">
            {user.avatar && (
              <AvatarImage src={toAbsoluteUrl(user.avatar)} alt="avatar" />
            )}
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{user.username}</p>
            {user.firstName && (
              <p className="text-sm text-gray-500">
                {user.firstName} {user.lastName}
              </p>
            )}
          </div>
        </div>
        <div className="flex">
          <Button
            className="flex-1"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("start-private-chat", { detail: user })
              );
              onOpenChange(false);
            }}
          >
            Xabar yozish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default UserInfoDialog;

