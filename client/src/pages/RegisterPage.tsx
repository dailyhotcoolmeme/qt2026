import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { checkAvailability, registerUser, startKakaoLogin } from "../lib/auth-client";

type FormValues = {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
  fullName: string;
  phone: string;
  church: string;
  rank: string;
  ageGroup: string;
  agreeRequired: boolean;
};

type CheckState = "idle" | "checking" | "available" | "taken";

const PENDING_GROUP_INVITE_KEY = "pending_group_invite";
const GROUP_INVITE_QUERY_KEY = "invite_group";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const AGE_GROUP_OPTIONS = [
  { value: "", label: "연령대 선택(선택)" },
  { value: "10s", label: "10대" },
  { value: "20s", label: "20대" },
  { value: "30s", label: "30대" },
  { value: "40s", label: "40대" },
  { value: "50s", label: "50대" },
  { value: "60_plus", label: "60대 이상" },
];

const NICKNAME_ADJECTIVES = ["은혜로운", "평안한", "성실한", "지혜로운", "단단한", "기쁜"];
const NICKNAME_NOUNS = ["제자", "순례자", "기도자", "청지기", "증인", "예배자"];

function readInviteGroupIdFromUrl(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  const fromSearch = String(searchParams.get(GROUP_INVITE_QUERY_KEY) || "").trim();
  if (UUID_REGEX.test(fromSearch)) return fromSearch;

  const hash = window.location.hash || "";
  const queryIdx = hash.indexOf("?");
  if (queryIdx >= 0) {
    const hashParams = new URLSearchParams(hash.substring(queryIdx + 1));
    const fromHash = String(hashParams.get(GROUP_INVITE_QUERY_KEY) || "").trim();
    if (UUID_REGEX.test(fromHash)) return fromHash;
  }

  try {
    const fromStorage = String(localStorage.getItem(PENDING_GROUP_INVITE_KEY) || "").trim();
    if (UUID_REGEX.test(fromStorage)) return fromStorage;
  } catch {
    // ignore
  }

  return null;
}

function makeRandomNickname(): string {
  const adjective = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
  const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)];
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${adjective}${noun}${suffix}`;
}

function validateUsername(value: string): string | null {
  if (!value) return "아이디를 입력해 주세요.";
  if (!/^[a-z0-9][a-z0-9._-]{3,31}$/.test(value)) {
    return "아이디는 4-32자, 영문 소문자/숫자/./_/- 만 사용할 수 있습니다.";
  }
  return null;
}

function validateEmail(value: string): string | null {
  if (!value) return "이메일을 입력해 주세요.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "올바른 이메일 형식이 아닙니다.";
  }
  return null;
}

function validatePassword(value: string): string | null {
  if (!value) return "비밀번호를 입력해 주세요.";
  if (value.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  return null;
}

function validateNickname(value: string): string | null {
  if (!value) return "닉네임을 입력해 주세요.";
  if (value.length < 2 || value.length > 40) return "닉네임은 2-40자 사이여야 합니다.";
  return null;
}

function normalizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "회원가입 중 오류가 발생했습니다.";

  const message = error.message || "";
  if (message.includes("username already exists")) return "이미 사용 중인 아이디입니다.";
  if (message.includes("email already exists")) return "이미 사용 중인 이메일입니다.";
  if (message.includes("nickname already exists")) return "이미 사용 중인 닉네임입니다.";
  if (message.includes("username must be")) return "아이디 형식을 다시 확인해 주세요.";
  if (message.includes("invalid email")) return "이메일 형식을 다시 확인해 주세요.";
  if (message.includes("password must be")) return "비밀번호는 8자 이상이어야 합니다.";
  if (message.includes("nickname must be")) return "닉네임 형식을 다시 확인해 주세요.";
  return message;
}

function checkButtonClass(state: CheckState): string {
  if (state === "available") return "bg-[#4A6741] text-white";
  if (state === "taken") return "bg-rose-100 text-rose-600";
  return "bg-zinc-100 text-zinc-700";
}

function checkButtonLabel(state: CheckState): string {
  if (state === "checking") return "확인중";
  if (state === "available") return "사용가능";
  if (state === "taken") return "사용중";
  return "중복확인";
}

export default function RegisterPage() {
  const [, setLocation] = useHashLocation();
  const { fontSize = 16 } = useDisplaySettings();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<CheckState>("idle");
  const [emailCheck, setEmailCheck] = useState<CheckState>("idle");
  const [nicknameCheck, setNicknameCheck] = useState<CheckState>("idle");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inviteGroupId = useMemo(() => readInviteGroupIdFromUrl(), []);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      username: "",
      email: "",
      password: "",
      passwordConfirm: "",
      nickname: "",
      fullName: "",
      phone: "",
      church: "",
      rank: "",
      ageGroup: "",
      agreeRequired: false,
    },
  });

  const usernameValue = watch("username");
  const emailValue = watch("email");
  const nicknameValue = watch("nickname");
  const passwordValue = watch("password");
  const passwordConfirmValue = watch("passwordConfirm");
  const agreeRequired = watch("agreeRequired");
  const isPasswordMatched = passwordConfirmValue.length > 0 && passwordValue === passwordConfirmValue;
  const usernameValidationMessage = usernameValue ? validateUsername(usernameValue) : null;
  const emailValidationMessage = emailValue ? validateEmail(emailValue) : null;
  const passwordValidationMessage = passwordValue ? validatePassword(passwordValue) : null;
  const nicknameValidationMessage = nicknameValue ? validateNickname(nicknameValue) : null;

  useEffect(() => {
    if (!getValues("nickname")) {
      setValue("nickname", makeRandomNickname(), { shouldDirty: true });
      setNicknameCheck("idle");
    }
  }, [getValues, setValue]);

  useEffect(() => {
    setUsernameCheck("idle");
  }, [usernameValue]);

  useEffect(() => {
    setEmailCheck("idle");
  }, [emailValue]);

  useEffect(() => {
    setNicknameCheck("idle");
  }, [nicknameValue]);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation("/auth");
  };

  const generateNickname = () => {
    setValue("nickname", makeRandomNickname(), { shouldDirty: true, shouldValidate: true });
    setNicknameCheck("idle");
  };

  const handleAvailabilityCheck = async (field: "username" | "email" | "nickname") => {
    const currentValues = getValues();
    let value = "";
    let errorMessage: string | null = null;
    let setState: React.Dispatch<React.SetStateAction<CheckState>>;

    if (field === "username") {
      value = String(currentValues.username || "").trim().toLowerCase();
      errorMessage = validateUsername(value);
      setState = setUsernameCheck;
    } else if (field === "email") {
      value = String(currentValues.email || "").trim().toLowerCase();
      errorMessage = validateEmail(value);
      setState = setEmailCheck;
    } else {
      value = String(currentValues.nickname || "").trim();
      errorMessage = validateNickname(value);
      setState = setNicknameCheck;
    }

    if (errorMessage) {
      setSubmitError(errorMessage);
      setState("idle");
      return;
    }

    setSubmitError("");
    setState("checking");

    try {
      const available = await checkAvailability(field, value);
      setState(available ? "available" : "taken");
      if (!available) {
        setSubmitError(
          field === "username"
            ? "이미 사용 중인 아이디입니다."
            : field === "email"
              ? "이미 사용 중인 이메일입니다."
              : "이미 사용 중인 닉네임입니다.",
        );
      }
    } catch (error) {
      setState("idle");
      setSubmitError(normalizeErrorMessage(error));
    }
  };

  const handleKakaoSignup = () => {
    if (!agreeRequired) {
      setSubmitError("이용약관과 개인정보 처리방침에 동의해 주세요.");
      return;
    }

    if (inviteGroupId) {
      try {
        localStorage.setItem(PENDING_GROUP_INVITE_KEY, inviteGroupId);
      } catch {
        // ignore
      }
    }

    startKakaoLogin(window.location.href);
  };

  const onSubmit = async (values: FormValues) => {
    const username = values.username.trim().toLowerCase();
    const email = values.email.trim().toLowerCase();
    const password = values.password;
    const nickname = values.nickname.trim();
    const fullName = values.fullName.trim();
    const phone = values.phone.trim();
    const church = values.church.trim();
    const rank = values.rank.trim();
    const ageGroup = values.ageGroup.trim();

    const localError =
      validateUsername(username) ||
      validateEmail(email) ||
      validatePassword(password) ||
      validateNickname(nickname);

    if (localError) {
      setSubmitError(localError);
      return;
    }

    if (password !== values.passwordConfirm) {
      setSubmitError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (!values.agreeRequired) {
      setSubmitError("이용약관과 개인정보 처리방침에 동의해 주세요.");
      return;
    }

    if (usernameCheck !== "available") {
      setSubmitError("아이디 중복확인을 완료해 주세요.");
      return;
    }

    if (emailCheck !== "available") {
      setSubmitError("이메일 중복확인을 완료해 주세요.");
      return;
    }

    if (nicknameCheck !== "available") {
      setSubmitError("닉네임 중복확인을 완료해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      if (inviteGroupId) {
        try {
          localStorage.setItem(PENDING_GROUP_INVITE_KEY, inviteGroupId);
        } catch {
          // ignore
        }
      }

      await registerUser({
        username,
        email,
        password,
        nickname,
        full_name: fullName || undefined,
        phone: phone || undefined,
        church: church || undefined,
        rank: rank || undefined,
        age_group: ageGroup || undefined,
      });

      window.location.replace(`${window.location.origin}/#/`);
    } catch (error) {
      setSubmitError(normalizeErrorMessage(error));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] px-6 pb-16 pt-12 text-left">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="-ml-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={24} />
          </button>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <p className="text-sm font-semibold tracking-[0.18em] text-[#4A6741]">CREATE ACCOUNT</p>
          <h1 className="mt-3 font-black leading-[1.25] text-zinc-900" style={{ fontSize: `${fontSize * 1.7}px` }}>
            Cloudflare 인증으로
            <br />
            새 계정을 만듭니다
          </h1>
          <p className="mt-4 break-keep text-zinc-500" style={{ fontSize: `${fontSize * 0.95}px` }}>
            아이디, 이메일, 닉네임은 가입 전에 중복확인을 완료해야 합니다.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
          className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <button
            type="button"
            onClick={handleKakaoSignup}
            className="flex h-[58px] w-full items-center justify-center gap-3 rounded-[20px] bg-[#FEE500] font-bold text-[#3C1E1E] transition-transform active:scale-[0.98]"
          >
            <img src="/kakao-login.png" alt="카카오" className="h-5 w-5" />
            카카오로 바로 시작하기
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs font-semibold tracking-[0.18em] text-zinc-400">OR</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-zinc-700">아이디</label>
              <div className="flex gap-2">
                <input
                  {...register("username", {
                    required: "아이디를 입력해 주세요.",
                    setValueAs: (value) => String(value || "").trim().toLowerCase(),
                  })}
                  autoComplete="username"
                  placeholder="영문 소문자, 숫자, . _ -"
                  className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 font-semibold text-zinc-900 outline-none transition-colors focus:border-[#4A6741]"
                />
                <button
                  type="button"
                  onClick={() => void handleAvailabilityCheck("username")}
                  disabled={usernameCheck === "checking"}
                  className={`w-[92px] shrink-0 rounded-2xl px-3 text-xs font-bold transition-colors ${checkButtonClass(usernameCheck)}`}
                >
                  {usernameCheck === "checking" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : checkButtonLabel(usernameCheck)}
                </button>
              </div>
              {(errors.username?.message || usernameValidationMessage) && (
                <p className="text-xs font-medium text-rose-500">
                  {errors.username?.message || usernameValidationMessage}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-zinc-700">이메일</label>
              <div className="flex gap-2">
                <input
                  {...register("email", {
                    required: "이메일을 입력해 주세요.",
                    setValueAs: (value) => String(value || "").trim().toLowerCase(),
                  })}
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 font-semibold text-zinc-900 outline-none transition-colors focus:border-[#4A6741]"
                />
                <button
                  type="button"
                  onClick={() => void handleAvailabilityCheck("email")}
                  disabled={emailCheck === "checking"}
                  className={`w-[92px] shrink-0 rounded-2xl px-3 text-xs font-bold transition-colors ${checkButtonClass(emailCheck)}`}
                >
                  {emailCheck === "checking" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : checkButtonLabel(emailCheck)}
                </button>
              </div>
              {(errors.email?.message || emailValidationMessage) && (
                <p className="text-xs font-medium text-rose-500">{errors.email?.message || emailValidationMessage}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-zinc-700">비밀번호</label>
              <div className="relative">
                <input
                  {...register("password", {
                    required: "비밀번호를 입력해 주세요.",
                  })}
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="8자 이상 입력"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 pr-12 font-semibold text-zinc-900 outline-none transition-colors focus:border-[#4A6741]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-zinc-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {(errors.password?.message || passwordValidationMessage) && (
                <p className="text-xs font-medium text-rose-500">
                  {errors.password?.message || passwordValidationMessage}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-zinc-700">비밀번호 확인</label>
              <div className="relative">
                <input
                  {...register("passwordConfirm", {
                    required: "비밀번호 확인을 입력해 주세요.",
                  })}
                  autoComplete="new-password"
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="비밀번호를 한 번 더 입력"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 pr-12 font-semibold text-zinc-900 outline-none transition-colors focus:border-[#4A6741]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-zinc-400"
                >
                  {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordConfirmValue.length > 0 && (
                <p className={`text-xs font-medium ${isPasswordMatched ? "text-[#4A6741]" : "text-rose-500"}`}>
                  {isPasswordMatched ? "비밀번호가 일치합니다." : "비밀번호 확인이 일치하지 않습니다."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-zinc-700">닉네임</label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    {...register("nickname", {
                      required: "닉네임을 입력해 주세요.",
                    })}
                    placeholder="앱에서 보이는 이름"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 pr-12 font-semibold text-zinc-900 outline-none transition-colors focus:border-[#4A6741]"
                  />
                  <button
                    type="button"
                    onClick={generateNickname}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#4A6741]"
                    aria-label="닉네임 새로 생성"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void handleAvailabilityCheck("nickname")}
                  disabled={nicknameCheck === "checking"}
                  className={`w-[92px] shrink-0 rounded-2xl px-3 text-xs font-bold transition-colors ${checkButtonClass(nicknameCheck)}`}
                >
                  {nicknameCheck === "checking" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : checkButtonLabel(nicknameCheck)}
                </button>
              </div>
              {(errors.nickname?.message || nicknameValidationMessage) && (
                <p className="text-xs font-medium text-rose-500">
                  {errors.nickname?.message || nicknameValidationMessage}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-zinc-700">이름</label>
                <input
                  {...register("fullName")}
                  autoComplete="name"
                  placeholder="선택 입력"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 font-semibold text-zinc-900 outline-none transition-colors focus:border-[#4A6741]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-zinc-700">연락처</label>
                <input
                  {...register("phone")}
                  autoComplete="tel"
                  placeholder="선택 입력"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 font-semibold text-zinc-900 outline-none transition-colors focus:border-[#4A6741]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-zinc-700">교회</label>
                <input
                  {...register("church")}
                  placeholder="선택 입력"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 font-semibold text-zinc-900 outline-none transition-colors focus:border-[#4A6741]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-zinc-700">직분</label>
                <input
                  {...register("rank")}
                  placeholder="선택 입력"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 font-semibold text-zinc-900 outline-none transition-colors focus:border-[#4A6741]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-zinc-700">연령대</label>
              <select
                {...register("ageGroup")}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 font-semibold text-zinc-900 outline-none transition-colors focus:border-[#4A6741]"
              >
                {AGE_GROUP_OPTIONS.map((option) => (
                  <option key={option.value || "empty"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <input
                {...register("agreeRequired")}
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#4A6741] focus:ring-[#4A6741]"
              />
              <span className="text-sm leading-relaxed text-zinc-600">
                <span className="font-bold text-zinc-800">필수 동의</span>
                {" "}
                <span className="underline underline-offset-4">
                  <Link href="/terms/service">이용약관</Link>
                </span>
                {" "}
                및
                {" "}
                <span className="underline underline-offset-4">
                  <Link href="/terms/privacy">개인정보 처리방침</Link>
                </span>
                에 동의합니다.
              </span>
            </label>

            {submitError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                {submitError}
              </div>
            )}

            {inviteGroupId && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                초대 링크를 통해 들어왔습니다. 가입 후 초대 정보는 브라우저에 유지됩니다.
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-[58px] w-full items-center justify-center rounded-[20px] bg-[#4A6741] font-black text-white shadow-lg shadow-green-100 transition-transform disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "회원가입"}
            </button>
          </form>
        </motion.section>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <span>이미 계정이 있나요?</span>
          <button type="button" onClick={() => setLocation("/auth")} className="font-bold text-[#4A6741]">
            로그인으로 이동
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-zinc-400">
          {agreeRequired && <Check size={14} className="text-[#4A6741]" />}
          <span>가입 시 약관 동의 정보는 Cloudflare D1에 기록됩니다.</span>
        </div>
      </div>
    </div>
  );
}
