import React, { useState, useEffect } from "react";
import { X, Camera, Check, Loader2 } from "lucide-react";
import { useDisplaySettings } from "./DisplaySettingsProvider";
import { useAuth } from "../hooks/use-auth";
import { supabase } from "../lib/supabase";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { fontSize } = useDisplaySettings();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    avatar_url: "",
    username: "",
    email: "",
    nickname: "",
    full_name: "",
    phone: "",
    church: "",
    rank: "",
  });
  
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  
  // Validation states
  const [usernameCheck, setUsernameCheck] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [emailCheck, setEmailCheck] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [passwordMatch, setPasswordMatch] = useState(true);

  // Load user data
  useEffect(() => {
    if (user) {
      setFormData({
        avatar_url: user.avatar_url || "",
        username: user.username || "",
        email: "",
        nickname: user.nickname || "",
        full_name: "",
        phone: "",
        church: user.church || "",
        rank: user.rank || "",
      });
      setAvatarPreview(user.avatar_url);
      
      // Load additional profile data
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", user.id)
      .single();
    
    if (data) {
      setFormData(prev => ({
        ...prev,
        email: data.email || "",
        full_name: data.full_name || "",
        phone: data.phone || "",
      }));
    }
  };

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload avatar to Supabase Storage
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user?.id) return null;
    
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Check username availability
  const checkUsername = async (username: string) => {
    if (!username || username === user?.username) {
      setUsernameCheck("idle");
      return;
    }
    
    setUsernameCheck("checking");
    
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .maybeSingle();
    
    setUsernameCheck(data ? "taken" : "available");
  };

  // Check email availability
  const checkEmail = async (email: string) => {
    if (!email) {
      setEmailCheck("idle");
      return;
    }
    
    setEmailCheck("checking");
    
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    
    setEmailCheck(data ? "taken" : "available");
  };

  // Handle password match check
  useEffect(() => {
    if (passwords.newPassword || passwords.confirmPassword) {
      setPasswordMatch(passwords.newPassword === passwords.confirmPassword);
    } else {
      setPasswordMatch(true);
    }
  }, [passwords.newPassword, passwords.confirmPassword]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;
    if (usernameCheck === "taken" || emailCheck === "taken") {
      alert("아이디 또는 이메일이 이미 사용 중입니다.");
      return;
    }
    if (!passwordMatch) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Upload avatar if changed
      let avatarUrl = formData.avatar_url;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }
      
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          email: formData.email,
          nickname: formData.nickname,
          full_name: formData.full_name,
          phone: formData.phone,
          church: formData.church,
          rank: formData.rank,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);
      
      if (profileError) throw profileError;
      
      // Update password if provided
      if (passwords.newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: passwords.newPassword,
        });
        
        if (passwordError) throw passwordError;
      }
      
      alert("프로필이 성공적으로 업데이트되었습니다.");
      window.location.reload(); // Refresh to load new data
    } catch (error) {
      console.error("Profile update error:", error);
      alert("프로필 업데이트 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[300] backdrop-blur-[2px]" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[310] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h2 className="font-bold text-zinc-900" style={{ fontSize: `${fontSize + 2}px` }}>
              프로필 관리
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-zinc-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center border-4 border-zinc-50">
                    <Camera className="w-10 h-10 text-zinc-300" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-[#4A6741] p-2 rounded-full cursor-pointer hover:bg-[#3d5636] transition-colors shadow-lg">
                  <Camera className="w-4 h-4 text-white" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-zinc-400" style={{ fontSize: `${fontSize - 4}px` }}>
                사진 변경하기
              </p>
            </div>
            
            {/* Username */}
            <div>
              <label className="block text-zinc-600 font-medium mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                아이디
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  onBlur={(e) => checkUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741] focus:border-transparent"
                  style={{ fontSize: `${fontSize}px` }}
                />
                {usernameCheck === "checking" && (
                  <Loader2 className="absolute right-3 top-3.5 w-5 h-5 text-zinc-400 animate-spin" />
                )}
                {usernameCheck === "available" && (
                  <Check className="absolute right-3 top-3.5 w-5 h-5 text-green-500" />
                )}
                {usernameCheck === "taken" && (
                  <span className="absolute right-3 top-3.5 text-red-500" style={{ fontSize: `${fontSize - 2}px` }}>
                    사용 중
                  </span>
                )}
              </div>
            </div>
            
            {/* Password */}
            <div>
              <label className="block text-zinc-600 font-medium mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                새 비밀번호
              </label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                placeholder="변경하지 않으려면 비워두세요"
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741] focus:border-transparent"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>
            
            {/* Confirm Password */}
            {passwords.newPassword && (
              <div>
                <label className="block text-zinc-600 font-medium mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 ${
                    passwordMatch 
                      ? 'border-zinc-200 focus:ring-[#4A6741]' 
                      : 'border-red-300 focus:ring-red-500'
                  }`}
                  style={{ fontSize: `${fontSize}px` }}
                />
                {!passwordMatch && (
                  <p className="text-red-500 mt-1" style={{ fontSize: `${fontSize - 4}px` }}>
                    비밀번호가 일치하지 않습니다
                  </p>
                )}
              </div>
            )}
            
            {/* Email */}
            <div>
              <label className="block text-zinc-600 font-medium mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                이메일 주소
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={(e) => checkEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741] focus:border-transparent"
                  style={{ fontSize: `${fontSize}px` }}
                />
                {emailCheck === "checking" && (
                  <Loader2 className="absolute right-3 top-3.5 w-5 h-5 text-zinc-400 animate-spin" />
                )}
                {emailCheck === "available" && (
                  <Check className="absolute right-3 top-3.5 w-5 h-5 text-green-500" />
                )}
                {emailCheck === "taken" && (
                  <span className="absolute right-3 top-3.5 text-red-500" style={{ fontSize: `${fontSize - 2}px` }}>
                    사용 중
                  </span>
                )}
              </div>
            </div>
            
            {/* Nickname */}
            <div>
              <label className="block text-zinc-600 font-medium mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                닉네임
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741] focus:border-transparent"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>
            
            {/* Full Name */}
            <div>
              <label className="block text-zinc-600 font-medium mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                이름
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741] focus:border-transparent"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>
            
            {/* Phone */}
            <div>
              <label className="block text-zinc-600 font-medium mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                연락처
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741] focus:border-transparent"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>
            
            {/* Church */}
            <div>
              <label className="block text-zinc-600 font-medium mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                섬기는 교회
              </label>
              <input
                type="text"
                value={formData.church}
                onChange={(e) => setFormData({ ...formData, church: e.target.value })}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741] focus:border-transparent"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>
            
            {/* Rank */}
            <div>
              <label className="block text-zinc-600 font-medium mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                직분
              </label>
              <input
                type="text"
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741] focus:border-transparent"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || usernameCheck === "taken" || emailCheck === "taken" || !passwordMatch}
              className="w-full bg-[#4A6741] text-white py-4 rounded-xl font-bold hover:bg-[#3d5636] transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ fontSize: `${fontSize}px` }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장하기"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
