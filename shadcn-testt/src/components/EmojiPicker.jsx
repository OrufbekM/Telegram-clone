import React, { useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import { Smile } from "lucide-react";
import { Button } from "./ui/button";

const EmojiPickerComponent = ({
  isOpen,
  onToggle,
  onEmojiSelect,
  className = "",
}) => {
  const pickerRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onToggle(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, onToggle]);
  const handleEmojiClick = (emojiData) => {
    onEmojiSelect(emojiData.emoji);
    onToggle(false);
  };
  return (
    <div className={`relative ${className}`}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onToggle(!isOpen)}
        className="h-10 w-10 p-0 hover:bg-gray-100 transition-colors"
        title="Emoji tanlash"
      >
        <Smile className="w-5 h-5 text-gray-500" />
      </Button>
      {}
      {isOpen && (
        <div
          ref={pickerRef}
          className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-200"
          style={{
            transform: "translateY(-4px)",
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme="light"
            emojiStyle="apple"
            searchDisabled={false}
            previewConfig={{
              showPreview: false,
            }}
            width={320}
            height={400}
            skinTonesDisabled={true}
            lazyLoadEmojis={true}
            categories={[
              {
                name: "Smileys & People",
                category: "smileys_people",
              },
              {
                name: "Animals & Nature",
                category: "animals_nature",
              },
              {
                name: "Food & Drink",
                category: "food_drink",
              },
              {
                name: "Activities",
                category: "activities",
              },
              {
                name: "Travel & Places",
                category: "travel_places",
              },
              {
                name: "Objects",
                category: "objects",
              },
              {
                name: "Symbols",
                category: "symbols",
              },
              {
                name: "Flags",
                category: "flags",
              },
            ]}
            style={{
              borderRadius: "16px",
              fontSize: "16px",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          />
        </div>
      )}
    </div>
  );
};
export default EmojiPickerComponent;

