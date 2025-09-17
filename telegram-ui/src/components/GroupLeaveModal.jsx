import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Trash2, LogOut } from "lucide-react";

const GroupLeaveModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  groupName, 
  isCreator = false 
}) => {
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);

  const handleConfirm = () => {
    onConfirm(deleteForEveryone);
    setDeleteForEveryone(false);
    onClose();
  };

  const handleClose = () => {
    setDeleteForEveryone(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCreator ? (
              <>
                <Trash2 className="w-5 h-5 text-red-500" />
                Guruhni o'chirish
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5 text-orange-500" />
                Guruhdan chiqish
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isCreator ? (
              `"${groupName}" guruhini o'chirishni xohlaysizmi?`
            ) : (
              `"${groupName}" guruhidan chiqishni xohlaysizmi?`
            )}
          </DialogDescription>
        </DialogHeader>

        {isCreator && (
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="deleteForEveryone"
              checked={deleteForEveryone}
              onCheckedChange={setDeleteForEveryone}
            />
            <label
              htmlFor="deleteForEveryone"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Barcha a'zolar uchun o'chirish
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Bekor qilish
          </Button>
          <Button 
            variant={isCreator && deleteForEveryone ? "destructive" : "default"}
            onClick={handleConfirm}
            className={isCreator && !deleteForEveryone ? "bg-orange-500 hover:bg-orange-600" : ""}
          >
            {isCreator ? (
              deleteForEveryone ? "Hammasi uchun o'chirish" : "Faqat men uchun chiqish"
            ) : (
              "Chiqish"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupLeaveModal;
