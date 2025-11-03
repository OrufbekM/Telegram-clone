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
    <Dialog open={isOpen} onOpenChange={handleClose} >
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
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
          <DialogDescription className="text-gray-700 dark:text-gray-300">
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
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-100"
            >
              Barcha a'zolar uchun o'chirish
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className={"dark:hover:bg-gray-900"}>
            Bekor qilish
          </Button>
          <Button 
            variant={isCreator && deleteForEveryone ? "destructive" : "default"}
            onClick={handleConfirm}
            className={isCreator && !deleteForEveryone ? "bg-gray-900 hover:bg-blue-700 dark:bg-blue-900 dark:hover:bg-blue-700 dark:text-white" : ""}
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
