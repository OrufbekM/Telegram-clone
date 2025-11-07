import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";

const ClearHistoryDialog = ({ open, onOpenChange, onConfirm, showForEveryoneToggle }) => {
  const [forEveryone, setForEveryone] = useState(false);

  useEffect(() => {
    if (!open) setForEveryone(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tarixni tozalash</DialogTitle>
          <DialogDescription>
            Rostan ham chat tarixini tozalamoqchimisiz?
          </DialogDescription>
        </DialogHeader>
        {showForEveryoneToggle && (
          <div className="flex items-center justify-between py-2">
            <label htmlFor="clear-for-everyone" className="text-sm select-none">Hamma uchun o'chirish</label>
            <input
              id="clear-for-everyone"
              type="checkbox"
              checked={forEveryone}
              onChange={(e) => setForEveryone(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bekor qilish</Button>
          <Button variant="destructive" onClick={() => onConfirm(!!forEveryone)}>Tozalash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClearHistoryDialog;
