import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Camera, Loader2 } from "lucide-react";
import { useDisplaySettings } from "./DisplaySettingsProvider";
import { useAuth } from "../hooks/use-auth";
import { supabase } from "../lib/supabase";
import { uploadFileToR2 } from "../utils/upload";
import { resolveApiUrl } from "../lib/appUrl";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CheckState = "idle" | "checking" | "available" | "taken";

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { fontSize } = useDisplaySettings();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isResettingAvatar, setIsResettingAvatar] = useState(false);

  const deleteAvatarFromR2 = async (avatarUrl?: string | null) => {
    if (!avatarUrl) return;

    const response = await fetch(resolveApiUrl("/api/file/delete"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: avatarUrl }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "avatar delete failed");
    }
  };

  const compressImageFile = async (file: File): Promise<File> => {
    const maxDimension = 1024;
    const targetMaxBytes = 350 * 1024;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("이미지 읽기 실패"));
      reader.readAsDataURL(file);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지 로드 실패"));
      img.src = dataUrl;
    });

    let width = image.width;
    let height = image.height;
    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, width, height);

    const toBlob = (quality: number) =>
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
      });

    let quality = 0.85;
    let blob = await toBlob(quality);
    while (blob && blob.size > targetMaxBytes && quality > 0.45) {
      quality -= 0.1;
      blob = await toBlob(quality);
    }

    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  };

  // 아바타 초기화 핸들러
  const handleAvatarReset = async () => {
    if (!user?.id) return;
    setIsResettingAvatar(true);
    try {
      // DB에서 avatar_url NULL 처리
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (error) throw error;

      await deleteAvatarFromR2(formData.avatar_url);

      setAvatarPreview(null);
      setAvatarFile(null);
      setFormData((prev) => ({ ...prev, avatar_url: "" }));
      alert("프로필 사진이 초기화되었습니다.");
    } catch (e) {
      console.error("avatar reset failed", e);
      alert("프로필 사진 초기화 중 오류가 발생했습니다.");
    } finally {
      setIsResettingAvatar(false);
    }
  };

  const [formData, setFormData] = useState({
    avatar_url: "",
    username: "",
    email: "",
    nickname: "",
    church: "",
    rank: "",
  });

  const [usernameCheck, setUsernameCheck] = useState<CheckState>("idle");
  const [emailCheck, setEmailCheck] = useState<CheckState>("idle");

  // 원본 값 추적 (변경 여부 판단용)
  const originalRef = useRef({ username: "", email: "" });

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      avatar_url: user.avatar_url || "",
      username: user.username || "",
      nickname: user.nickname || "",
      church: user.church || "",
      rank: user.rank || "",
    }));
    setAvatarPreview(user.avatar_url || null);

    // 원본값 저장
    originalRef.current.username = user.username || "";

    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (data) {
      setFormData((prev) => ({
        ...prev,
        email: data.email || "",
      }));
      originalRef.current.email = data.email || "";
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const optimized = await compressImageFile(file);
    setAvatarFile(optimized);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(optimized);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user?.id) return null;
    await deleteAvatarFromR2(formData.avatar_url);

    const uploadedUrl = await uploadFileToR2(avatarFile, `avatars/profile/${user.id}`);
    return uploadedUrl || null;
  };

  const checkDuplicate = async (
    field: "username" | "email",
    value: string,
    setter: React.Dispatch<React.SetStateAction<CheckState>>
  ) => {
    const normalized = String(value || "").trim();
    if (!normalized) {
      setter("idle");
      return;
    }

    // 원본 값과 같으면 바로 통과
    if (normalized === (originalRef.current[field] || "")) {
      setter("available");
      return;
    }

    setter("checking");
    const { data } = await supabase.from("profiles").select("id").eq(field, normalized).maybeSingle();
    if (!data || data.id === user?.id) setter("available");
    else setter("taken");
  };

  const statusText = (state: CheckState) => {
    if (state === "available") return "확인완료";
    if (state === "taken") return "사용중";
    if (state === "checking") return "확인중";
    return "중복확인";
  };

  const statusClass = (state: CheckState) => {
    if (state === "available") return "bg-emerald-100 text-emerald-700";
    if (state === "taken") return "bg-red-100 text-red-600";
    return "bg-zinc-100 text-zinc-600";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const orig = originalRef.current;

    // 변경된 필드만 중복확인 필요 (변경 없으면 자동 통과)
    const usernameChanged = formData.username !== orig.username;
    const emailChanged = formData.email !== orig.email;

    if (!formData.username || (usernameChanged && usernameCheck !== "available")) {
      alert("아이디 중복확인을 완료해 주세요.");
      return;
    }
    if (formData.email && emailChanged && emailCheck !== "available") {
      alert("이메일 중복확인을 완료해 주세요.");
      return;
    }
    if (!formData.nickname) {
      alert("닉네임을 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    try {
      let avatarUrl = formData.avatar_url;
      if (avatarFile) {
        const uploaded = await uploadAvatar();
        if (uploaded) avatarUrl = uploaded;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          email: formData.email,
          nickname: formData.nickname,
          church: formData.church,
          rank: formData.rank,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;



      alert("프로필이 업데이트되었습니다.");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("프로필 업데이트 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black/40 z-[300] backdrop-blur-[2px]" onClick={onClose} />

      {/* 모달 컨테이너 */}
      <div className="fixed inset-0 z-[310] flex items-end sm:items-center justify-center px-4 py-4 overflow-hidden">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          drag="y"
          dragDirectionLock
          dragConstraints={{ top: 0, bottom: 240 }}
          dragElastic={{ top: 0, bottom: 0.2 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 90 || info.velocity.y > 700) {
              onClose();
            }
          }}
          className="bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] overflow-y-auto overflow-x-hidden"
          style={{ maxWidth: "min(100%, 448px)" }}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-zinc-200" />
          {/* 헤더 */}
          <div className="sticky top-0 bg-white border-b px-4 py-4 flex items-center justify-between z-10">
            <h2 className="font-bold text-zinc-900" style={{ fontSize: `${fontSize + 2}px` }}>
              프로필 관리
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-4 py-5 space-y-5">
            {/* 1. 아바타 */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview.startsWith("http://") ? `https://${avatarPreview.slice(7)}` : avatarPreview}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-zinc-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center border-4 border-zinc-50">
                    <Camera className="w-10 h-10 text-zinc-300" />
                  </div>
                )}
                <label className="absolute bottom-0 -right-2 bg-[#4A6741] p-2 rounded-full cursor-pointer hover:bg-[#3d5636] transition-colors shadow-lg">
                  <Camera className="w-4 h-4 text-white" />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
                {/* 사진 초기화 버튼 */}
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleAvatarReset}
                    disabled={isResettingAvatar}
                    className="absolute top-0 -right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-colors text-xs"
                    style={{ fontSize: '0.75rem', minWidth: 0 }}
                  >
                    {isResettingAvatar ? '삭제중' : '초기화'}
                  </button>
                )}
              </div>
            </div>

            {/* 2. 닉네임 */}
            <div>
              <label className="block text-zinc-600 font-bold mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                닉네임 (앱에서 보여지는 이름)
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className="w-full px-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>

            {/* 3. 이메일 (중복확인) */}
            <div>
              <label className="block text-zinc-600 font-bold mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                이메일
              </label>
              <div className="flex gap-2 items-stretch">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setEmailCheck("idle");
                  }}
                  className="min-w-0 flex-1 px-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]"
                  style={{ fontSize: `${fontSize}px` }}
                />
                <button
                  type="button"
                  onClick={() => checkDuplicate("email", formData.email, setEmailCheck)}
                  className={`shrink-0 w-[4.5rem] rounded-xl text-xs font-bold text-center leading-tight ${statusClass(emailCheck)}`}
                >
                  {emailCheck === "checking" ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    statusText(emailCheck)
                  )}
                </button>
              </div>
            </div>

            {/* 4. 아이디 (중복확인) */}
            <div>
              <label className="block text-zinc-600 font-bold mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                아이디 (ID)
              </label>
              <div className="flex gap-2 items-stretch">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value });
                    setUsernameCheck("idle");
                  }}
                  className="min-w-0 flex-1 px-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]"
                  style={{ fontSize: `${fontSize}px` }}
                />
                <button
                  type="button"
                  onClick={() => checkDuplicate("username", formData.username, setUsernameCheck)}
                  className={`shrink-0 w-[4.5rem] rounded-xl text-xs font-bold text-center leading-tight ${statusClass(usernameCheck)}`}
                >
                  {usernameCheck === "checking" ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    statusText(usernameCheck)
                  )}
                </button>
              </div>
            </div>

            {/* 5. 섬기는 교회 */}
            <div>
              <label className="block text-zinc-600 font-bold mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                섬기는 교회
              </label>
              <input
                type="text"
                value={formData.church}
                onChange={(e) => setFormData({ ...formData, church: e.target.value })}
                className="w-full px-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>

            {/* 7. 직분 */}
            <div>
              <label className="block text-zinc-600 font-bold mb-2" style={{ fontSize: `${fontSize - 2}px` }}>
                직분
              </label>
              <input
                type="text"
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                className="w-full px-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>

            {/* 저장 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-[#4A6741] text-white font-bold disabled:opacity-60 shadow-lg shadow-green-100 active:scale-[0.98] transition-all"
              style={{ fontSize: `${fontSize}px` }}
            >
              {isLoading ? "저장 중..." : "저장"}
            </button>
          </form>
        </motion.div>
      </div>
    </>
  );
}
