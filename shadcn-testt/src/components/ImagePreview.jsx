import * as React from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger 
} from "./ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "./ui/carousel"
import { Card, CardContent } from "./ui/card"

const toAbsoluteUrl = (url) => {
  if (!url) return "";
  const API_URL = "http://localhost:3000";
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export function ImagePreview({ 
  images, 
  allChatImages = null, 
  currentImageIndex = 0,
  children, 
  className,
  onClose
}) {
  // Handle both single image (string) and multiple images (array)
  const imageArray = Array.isArray(images) ? images : [images]
  
  const carouselImages = allChatImages || imageArray
  
  let startIndex = 0
  if (allChatImages && imageArray.length > 0) {
    const firstImage = imageArray[0]
    startIndex = allChatImages.findIndex(img => img === firstImage)
    if (startIndex === -1) startIndex = 0
  }
  
  const [api, setApi] = React.useState(null)
  
  // Scroll to the correct starting position when API is available
  React.useEffect(() => {
    if (api && startIndex > 0) {
      api.scrollTo(startIndex)
    }
  }, [api, startIndex])
  
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose && onClose()}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 border-0 bg-transparent dark:bg-gray-900 shadow-none">
        <Carousel className="w-full max-w-4xl" setApi={setApi}>
          <CarouselContent>
            {carouselImages.map((image, index) => (
              <CarouselItem key={index} className="flex items-center justify-center">
                <div className="relative w-full h-[70vh] flex items-center justify-center">
                  <img
                    src={toAbsoluteUrl(image)}
                    alt={`Preview ${index + 1}`}
                    className="max-w-full max-h-full object-contain rounded-lg dark:bg-gray-800"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {carouselImages.length > 1 && (
            <>
              <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 dark:bg-gray-800/80 dark:hover:bg-gray-700/90 text-white border-0" />
              <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 dark:bg-gray-800/80 dark:hover:bg-gray-700/90 text-white border-0" />
            </>
          )}
        </Carousel>
      </DialogContent>
    </Dialog>
  )
}