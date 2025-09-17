import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { AlertCircle, Home, MessageCircle } from "lucide-react";
const NotFound = () => {
  const navigate = useNavigate();
  const handleGoHome = () => {
    navigate("/chat");
  };
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Sahifa topilmadi
          </CardTitle>
          <CardDescription className="text-gray-600">
            Kechirasiz, siz qidirayotgan sahifa mavjud emas yoki o'chirilgan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button onClick={handleGoHome} className="w-full" size="lg">
              <MessageCircle className="w-4 h-4 mr-2" />
              Bosh sahifaga qaytish
            </Button>
          </div>
          <div className="text-center pt-4">
            <p className="text-xs text-gray-400">
              Agar muammo davom etsa, sahifani yangilang yoki qo'llab-quvvatlash
              xizmatiga murojaat qiling.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default NotFound;

