import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { X, Upload, Image, Loader2, Send, Plus } from "lucide-react";
import "../App.css";
import EmojiPickerComponent from "./EmojiPicker";

const ImageUpload = ({
  onImageSelect,
  onCancel,
  onUploadComplete,
  onComplete,
  autoOpen = false,
  isForMessage = false,
}) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]); // multiple selection support
  const [previewUrls, setPreviewUrls] = useState([]); // multiple previews
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [caption, setCaption] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // ✅ qo‘shish kerak

  // Debug logging for component state

  // Cleanup when component unmounts or when there's an error
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (previewUrls && previewUrls.length) {
        previewUrls.forEach((u) => {
          try { URL.revokeObjectURL(u); } catch (e) {}
        });
      }
    };
  }, [previewUrl, previewUrls]);

  const API_URL = "http://localhost:3000";

  // Emoji tanlash
const handleEmojiSelect = (emoji) => {
  const symbol = emoji?.emoji || emoji; // Kutubxonaga qarab emoji.emoji bo‘ladi
  setCaption((prev) => prev + symbol);
  setShowEmojiPicker(false);
};


  // Auto-open file picker when component mounts - only once
  useEffect(() => {
    if (autoOpen && fileInputRef.current && !selectedImage) {
      // Small delay to prevent double opening
      const timeoutId = setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [autoOpen]); // Remove selectedImage from dependencies

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    const file = files[0];
    if (!file) {
      // If no file selected and autoOpen is true, close the component
      if (autoOpen && onCancel) {
        onCancel();
      }
      return;
    }

    // Helper to validate a single file
    const validate = (f) => {
      if (!f.type.startsWith("image/")) {
        setError("Faqat rasm fayllari ruxsat etilgan");
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        setError("Rasm hajmi 10MB dan kichik bo'lishi kerak");
        return false;
      }
      return true;
    };

    // If user selected multiple images for message, show multi preview modal
    if (isForMessage && files.length > 1) {
      const valid = files.filter((f) => validate(f));
      if (valid.length === 0) return;
      setSelectedImages(valid);
      // build previews
      const readers = await Promise.all(
        valid.map(
          (f) =>
            new Promise((resolve) => {
              const r = new FileReader();
              r.onload = (e) => resolve(e.target.result);
              r.readAsDataURL(f);
            })
        )
      );
      setPreviewUrls(readers);
      return;
    }

    // Single-file flow (preview with optional caption)
    if (!validate(file)) return;
    setError(null);
    setSelectedImage(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);

    if (onImageSelect) {
      onImageSelect(file);
    }

    if (autoOpen && onComplete && !isForMessage) {
      console.log("🚀 Auto-uploading image for group avatar...");
      await handleAutoSend(file);
    }
  };

  const handleAutoSend = async (file, captionForAll = "", closeAfter = true) => {
    if (!file) {
      console.error("❌ No file provided for upload");
      return;
    }

    console.log("🚀 Starting auto upload for file:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      console.log(
        "📦 FormData created, sending to:",
        `${API_URL}/api/upload/image`
      );
      console.log("📋 File details:", {
        filename: file.name,
        size: file.size,
        type: file.type,
      });

      // XMLHttpRequest bilan progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          console.log("🔄 XHR onload triggered with status:", xhr.status);
          console.log("📝 Response text:", xhr.responseText);

          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log("📤 Upload response parsed:", response);
              resolve(response);
            } catch (parseError) {
              console.error("❌ JSON parse error:", parseError);
              console.error("❌ Raw response text:", xhr.responseText);
              reject(new Error("Server javobini o'qishda xatolik"));
            }
          } else {
            console.error("❌ Upload failed with status:", xhr.status);
            console.error("❌ Response text:", xhr.responseText);
            console.error("❌ Response headers:", xhr.getAllResponseHeaders());
            reject(
              new Error(`Server xatoligi: ${xhr.status} - ${xhr.responseText}`)
            );
          }
        };

        xhr.onerror = (error) => {
          console.error("❌ Network error:", error);
          console.error("❌ XHR error details:", {
            readyState: xhr.readyState,
            status: xhr.status,
            statusText: xhr.statusText,
          });
          reject(new Error("Tarmoq xatoligi"));
        };

        console.log(
          "🌐 Opening XHR connection to:",
          `${API_URL}/api/upload/image`
        );
        xhr.open("POST", `${API_URL}/api/upload/image`);

        console.log("🚀 Sending FormData...");
        xhr.send(formData);
      });

      const result = await uploadPromise;

      if (result.success) {
        console.log("✅ Image uploaded successfully:", result);
        // Call the completion handler with image data
        if (onComplete) {
          onComplete({
            url: result.image.url,
            filename: result.image.filename,
            originalName: result.image.originalName,
            size: result.image.size,
            caption: captionForAll || "",
          });
        }
        // Reset/close only when explicitly requested (single-file flows)
        if (closeAfter) {
          resetState();
          if (onCancel) {
            onCancel();
          }
        }
      } else {
        console.error("❌ Upload failed:", result);
        setError(result.message || "Yuklashda xatolik");
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      setError(error.message || "Rasmni yuklashda xatolik yuz berdi");
      // Don't close component on error, let user see the error and retry
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSend = async () => {
    if (!selectedImage) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      // XMLHttpRequest bilan progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (parseError) {
              reject(new Error("Server javobini o'qishda xatolik"));
            }
          } else {
            console.error(
              "❌ Upload failed with status:",
              xhr.status,
              xhr.responseText
            );
            reject(new Error(`Server xatoligi: ${xhr.status}`));
          }
        };

        xhr.onerror = (error) => {
          console.error("❌ Network error:", error);
          reject(new Error("Tarmoq xatoligi"));
        };

        xhr.open("POST", `${API_URL}/api/upload/image`);
        xhr.send(formData);
      });

      const result = await uploadPromise;

      if (result.success) {
        // Call the completion handler with image data and caption
        if (onComplete) {
          onComplete({
            url: result.image.url,
            filename: result.image.filename,
            originalName: result.image.originalName,
            size: result.image.size,
            caption: caption.trim(), // Include caption
          });
        }
        // Reset state
        resetState();
      } else {
        setError(result.message || "Yuklashda xatolik");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setError("Rasmni yuklashda xatolik yuz berdi");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetState = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setSelectedImages([]);
    setPreviewUrls([]);
    setError(null);
    setUploadProgress(0);
    setCaption("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    console.log("🗙️ ImageUpload cancelled by user");
    resetState();
    if (onCancel) {
      onCancel();
    }
  };

  const forceReset = () => {
    console.log("⚠️ Force resetting ImageUpload");
    setIsUploading(false);
    setUploadProgress(0);
    resetState();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isUploading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="loader"></div>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Rasm yuborilmoqda...
            </p>
            <div className="mb-4">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-gray-500 mt-2">{uploadProgress}%</p>
            </div>

            <div className="flex space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Bekor qilish
              </Button>
              <Button
                variant="destructive"
                onClick={forceReset}
                className="flex-1"
              >
                To'xtatish
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">Xatolik!</p>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setError(null)}
                variant="outline"
                className="flex-1"
              >
                Qayta urinish
              </Button>
              <Button
                onClick={handleCancel}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Yopish
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multi-image modal for messages
  if (selectedImages.length > 1 && previewUrls.length > 1) {
    return (
      <div className="fixed inset-0 bg-gray-400/40 bg-opacity-60 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white border border-[10px] border-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Send images</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="rounded-full w-8 h-8 p-0 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-auto">
              {previewUrls.map((url, idx) => (
                <img key={idx} src={url} alt="Preview" className="w-full h-32 object-cover rounded-lg border" />
              ))}
            </div>
          </div>

          <div className="px-4 pb-3">
            <div className="flex items-center space-x-2">
              <EmojiPickerComponent
                isOpen={showEmojiPicker}
                onToggle={setShowEmojiPicker}
                onEmojiSelect={handleEmojiSelect}
                className="flex-shrink-0"
              />
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption for all..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-gray-900 placeholder-gray-400 transition-all"
              />
            </div>
          </div>

          <div className="px-4 py-3 flex space-x-3 justify-end bg-gray-50">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isUploading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-all text-sm text-gray-700 bg-white"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsUploading(true);
                try {
                  // Upload each, collect URLs then call onComplete ONCE
                  const urls = [];
                  for (const f of selectedImages) {
                    // eslint-disable-next-line no-await-in-loop
                    const url = await new Promise((resolve, reject) => {
                      const formData = new FormData();
                      formData.append('image', f);
                      const xhr = new XMLHttpRequest();
                      xhr.onload = () => {
                        try {
                          if (xhr.status === 200) {
                            const resp = JSON.parse(xhr.responseText);
                            resolve(resp?.image?.url);
                          } else {
                            reject(new Error('Upload failed'));
                          }
                        } catch (e) { reject(e); }
                      };
                      xhr.onerror = reject;
                      xhr.open('POST', `${API_URL}/api/upload/image`);
                      xhr.send(formData);
                    });
                    if (url) urls.push(url);
                  }
                  if (onComplete && urls.length) {
                    onComplete({ images: urls, caption: caption.trim() });
                  }
                  resetState(); if (onCancel) onCancel();
                } finally {
                  setIsUploading(false);
                }
              }}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm font-medium transition-all min-w-[80px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedImage && previewUrl) {
    return (
      <div className="fixed inset-0 bg-gray-400/40 bg-opacity-60 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white border border-[10px] border-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Send an image</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="rounded-full w-8 h-8 p-0 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-col ">
            <div className="relative bg-white pt-10 pb-10">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-64 object-cover border rounded-xl"
              />
            </div>

            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <EmojiPickerComponent
                  isOpen={showEmojiPicker}
                  onToggle={setShowEmojiPicker}
                  onEmojiSelect={handleEmojiSelect}
                  className="flex-shrink-0"
                />

                <div className="flex-1">
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isUploading) {
                        handleSend();
                      }
                    }}
                    placeholder="Add a caption..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 
                   focus:border-transparent text-sm bg-white text-gray-900 
                   placeholder-gray-400 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 flex space-x-3 justify-end bg-gray-50">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isUploading}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-all text-sm text-gray-700 bg-white"
              >
                Cancel
              </Button>

              <Button
                onClick={handleSend}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm font-medium transition-all min-w-[80px]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hidden file input - auto-opens when component mounts
  return (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      multiple
      onChange={handleFileSelect}
      className="hidden"
    />
  );
};

export default ImageUpload;
