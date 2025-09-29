import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Play, Pause, Eye } from "lucide-react";

const VoiceMessagePlayer = ({
  voiceMessage,
  isSelf,
  timestamp,
  isEdited,
  isRead,
  messageReaders,
  chatType,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const prevUrlRef = useRef(null);

  // Set duration from voiceMessage prop
  useEffect(() => {
    if (voiceMessage?.duration) {
      setDuration(voiceMessage.duration);
    }
  }, [voiceMessage?.duration]);

  // Create/recreate audio URL from base64 data. Revoke previous URL safely.
  useEffect(() => {
    if (!voiceMessage?.data) return;
    try {
      const binaryString = atob(voiceMessage.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: voiceMessage.mimeType || 'audio/webm' });
      const url = URL.createObjectURL(blob);
      // Revoke previous URL if any
      if (prevUrlRef.current && prevUrlRef.current !== url) {
        try { URL.revokeObjectURL(prevUrlRef.current); } catch {}
      }
      prevUrlRef.current = url;
      setAudioUrl(url);
    } catch (error) {
      console.error('Error creating audio URL:', error);
    }
    return () => {
      // On unmount, revoke the last URL
      if (prevUrlRef.current) {
        try { URL.revokeObjectURL(prevUrlRef.current); } catch {}
        prevUrlRef.current = null;
      }
    };
  }, [voiceMessage?.data, voiceMessage?.mimeType]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      // Only update duration from audio metadata if we don't have it from voiceMessage prop
      if (!voiceMessage?.duration && audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If finished or at end, reset to start before playing again
      if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.05)) {
        try { audio.currentTime = 0; } catch {}
      }
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  };

  // Generate waveform bars based on volume levels
  const generateWaveform = () => {
    const bars = [];
    const barCount = 40;
    const progressBars = Math.floor((currentTime / duration) * barCount) || 0;
    
    for (let i = 0; i < barCount; i++) {
      // Use volume levels if available, otherwise use consistent heights
      let baseHeight;
      if (voiceMessage.volumeLevels && voiceMessage.volumeLevels.length > 0) {
        const volumeIndex = Math.floor((i / barCount) * voiceMessage.volumeLevels.length);
        const volumeLevel = voiceMessage.volumeLevels[volumeIndex] || 0;
        // Map volume level (0-1) to height (8-28px)
        baseHeight = 8 + (volumeLevel * 20);
      } else {
        // Use consistent pattern instead of random for fallback
        const pattern = [12, 16, 20, 14, 18, 10, 22, 15, 19, 13];
        baseHeight = pattern[i % pattern.length];
      }
      
      const isActive = i < progressBars;
      
      bars.push(
        <div
          key={i}
          className={`w-1 rounded-full transition-colors duration-200 ${
            isChannel
              ? isActive
                ? "bg-gray-700"
                : "bg-gray-400"
              : isActive
              ? isSelf
                ? "bg-white"
                : "bg-blue-500"
              : isSelf
              ? "bg-white/30"
              : "bg-gray-300"
          }`}
          style={{
            height: `${baseHeight}px`,
            minHeight: '4px'
          }}
        />
      );
    }
    return bars;
  };

  const isChannel = chatType === 'channel';
  return (
    <div
      className={`px-4 py-3 rounded-2xl ${
        isChannel
          ? "bg-gray-200 text-gray-900"
          : isSelf
          ? "bg-[#0088ff] text-white shadow-sm"
          : "bg-white border border-gray-200 text-gray-900 shadow-sm"
      } min-w-[280px] max-w-[350px] transition-all duration-200 hover:shadow-md`}
    >
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}
      
      <div className="flex items-center space-x-3">
        {/* Play/Pause Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 rounded-full transition-colors ${
            isChannel
              ? "hover:bg-gray-300/50 text-gray-800"
              : isSelf
              ? "hover:bg-white/20 text-white"
              : "hover:bg-blue-50 text-blue-600 bg-blue-500/10"
          }`}
          onClick={togglePlayPause}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        {/* Waveform Visualization */}
        <div className="flex-1 flex flex-col space-y-2">
          <div className="flex items-center justify-center space-x-0.5 h-8 px-1">
            {generateWaveform()}
          </div>
          
          {/* Time Display */}
          <div className="flex justify-between">
            <span
              className={`text-xs font-medium ${
                isChannel ? "text-gray-700" : isSelf ? "text-white/90" : "text-gray-600"
              }`}
            >
              {formatTime(currentTime)}
            </span>
            <span
              className={`text-xs font-medium ${
                isChannel ? "text-gray-600" : isSelf ? "text-white/70" : "text-gray-500"
              }`}
            >
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Timestamp and channel view count */}
      <div className="flex items-center justify-between mt-3 pt-1">
        <p
          className={`text-[11px] font-medium ${
            isChannel ? "text-gray-700" : isSelf ? "text-white/80" : "text-gray-500"
          }`}
        >
          {isEdited ? "edited • " : ""}
          {new Date(timestamp).toLocaleTimeString("uz-UZ", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        {isChannel && (
          <div className="ml-2 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-gray-700" />
            <span className="text-[11px] font-medium text-gray-700">
              {Array.isArray(messageReaders) ? messageReaders.length : 0}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceMessagePlayer;
