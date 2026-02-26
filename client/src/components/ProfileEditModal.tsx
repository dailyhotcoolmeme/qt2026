import React, { useEffect, useRef, useState } from "react";
import { X, Camera, Loader2 } from "lucide-react";
import { useDisplaySettings } from "./DisplaySettingsProvider";
import { useAuth } from "../hooks/use-auth";
import { supabase } from "../lib/supabase";

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

  const [usernameCheck, setUsernameCheck] = useState<CheckState>("idle");
  const [emailCheck, setEmailCheck] = useState<CheckState>("idle");
  const [nicknameCheck, setNicknameCheck] = useState<CheckState>("idle");

  // 원본 값 추적 (변경 여부 판단용)
  const originalRef = useRef({ username: "", email: "", nickname: "" });

  const passwordMatch =
    !passwords.newPassword || passwords.newPassword === passwords.confirmPassword;

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
    originalRef.current.nickname = user.nickname || "";

    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("email,full_name,phone")
      .eq("id", user.id)
      .single();

    if (data) {
      setFormData((prev) => ({
        ...prev,
        email: data.email || "",
        full_name: data.full_name || "",
        phone: data.phone || "",
      }));
      originalRef.current.email = data.email || "";
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user?.id) return null;
    const ext = avatarFile.name.split(".").pop() || "jpg";
    const fileName = `${user.id}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(fileName, avatarFile, { upsert: true });
    if (error) return null;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const checkDuplicate = async (
    field: "username" | "email" | "nickname",
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
    const nicknameChanged = formData.nickname !== orig.nickname;

    if (!formData.username || (usernameChanged && usernameCheck !== "available")) {
      alert("아이디 중복확인을 완료해 주세요.");
      return;
    }
    if (formData.email && emailChanged && emailCheck !== "available") {
      alert("이메일 중복확인을 완료해 주세요.");
      return;
    }
    if (!formData.nickname || (nicknameChanged && nicknameCheck !== "available")) {
      alert("닉네임 중복확인을 완료해 주세요.");
      return;
    }
    if (passwords.newPassword && !passwords.confirmPassword) {
      alert("비밀번호 확인을 입력해 주세요.");
      return;
    }
    if (!passwordMatch) {
      alert("비밀번호가 일치하지 않습니다.");
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
          full_name: formData.full_name,
          phone: formData.phone,
          church: formData.church,
          rank: formData.rank,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      if (passwords.newPassword) {
        const { error: pwError } = await supabase.auth.updateUser({ password: passwords.newPassword });
        if (pwError) throw pwError;
      }

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

  // 중복확인 필드 정의
  const dupFields = [
    {
      label: "아이디",
      key: "username" as const,
      check: usernameCheck,
      setCheck: setUsernameCheck,
      type: "text",
    },
    {
      label: "이메일",
      key: "email" as const,
      check: emailCheck,
      setCheck: setEmailCheck,
      type: "email",
    },
    {
      label: "닉네임 (앱에서 보여지는 이름)",
      key: "nickname" as const,
      check: nicknameCheck,
      setCheck: setNicknameCheck,
      type: "text",
    },
  ];

  return (
    <>
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black/40 z-[300] backdrop-blur-[2px]" onClick={onClose} />

      {/* 모달 컨테이너 - 가로 넘침 방지 */}
      <div className="fixed inset-0 z-[310] flex items-center justify-center px-4 py-4 overflow-hidden">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] overflow-y-auto overflow-x-hidden"
          style={{ maxWidth: "min(100%, 448px)" }}
        >
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
            {/* 아바타 */}
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
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* 중복확인 필드들 - 각각 독립적으로 확인 */}
            {dupFields.map((f) => (
              <div key={f.key}>
                <label
                  className="block text-zinc-600 font-medium mb-2 leading-snug"
                  style={{ fontSize: `${fontSize - 2}px` }}
                >
                  {f.label}
                </label>
                {/* 입력+버튼 행: 버튼 고정너비로 넘침 방지 */}
                <div className="flex gap-2 items-stretch">
                  <input
                    type={f.type}
                    value={formData[f.key]}
                    onChange={(e) => {
                      setFormData({ ...formData, [f.key]: e.target.value });
                      f.setCheck("idle");
                    }}
                    className="min-w-0 flex-1 px-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]"
                    style={{ fontSize: `${fontSize}px` }}
                  />
                  <button
                    type="button"
                    onClick={() => checkDuplicate(f.key, formData[f.key], f.setCheck)}
                    className={`shrink-0 w-[4.5rem] rounded-xl text-xs font-bold text-center leading-tight ${statusClass(f.check)}`}
                  >
                    {f.check === "checking" ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      statusText(f.check)
                    )}
                  </button>
                </div>
              </div>
            ))}

            {/* 새 비밀번호 */}
            <div>
              <label
                className="block text-zinc-600 font-medium mb-2"
                style={{ fontSize: `${fontSize - 2}px` }}
              >
                새 비밀번호
              </label>
              <input
                type="password"
                placeholder="변경하지 않으려면 비워두세요"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full px-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>

            {/* 비밀번호 확인 - 항상 표시 */}
            <div>
              <label
                className="block text-zinc-600 font-medium mb-2"
                style={{ fontSize: `${fontSize - 2}px` }}
              >
                비밀번호 확인
              </label>
              <input
                type="password"
                placeholder="새 비밀번호를 다시 입력하세요"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className={`w-full px-3 py-3 border rounded-xl focus:outline-none focus:ring-2 ${passwordMatch
                    ? "border-zinc-200 focus:ring-[#4A6741]"
                    : "border-red-300 focus:ring-red-500"
                  }`}
                style={{ fontSize: `${fontSize}px` }}
              />
              {!passwordMatch && (
                <p className="text-red-500 mt-1 text-xs">비밀번호가 일치하지 않습니다.</p>
              )}
              {passwords.newPassword && passwordMatch && passwords.confirmPassword && (
                <p className="text-emerald-600 mt-1 text-xs">비밀번호가 일치합니다.</p>
              )}
            </div>

            {/* 본명 */}
            <div>
              <label
                className="block text-zinc-600 font-medium mb-2"
                style={{ fontSize: `${fontSize - 2}px` }}
              >
                본명
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>

            {/* 연락처 */}
            <div>
              <label
                className="block text-zinc-600 font-medium mb-2"
                style={{ fontSize: `${fontSize - 2}px` }}
              >
                연락처
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6741]"
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>

            {/* 섬기는 교회 */}
            <div>
              <label
                className="block text-zinc-600 font-medium mb-2"
                style={{ fontSize: `${fontSize - 2}px` }}
              >
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

            {/* 직분 */}
            <div>
              <label
                className="block text-zinc-600 font-medium mb-2"
                style={{ fontSize: `${fontSize - 2}px` }}
              >
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
              className="w-full py-3 rounded-xl bg-[#4A6741] text-white font-bold disabled:opacity-60"
              style={{ fontSize: `${fontSize}px` }}
            >
              {isLoading ? "저장 중..." : "저장"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
