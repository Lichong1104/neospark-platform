import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Sparkles, Zap, Globe } from "lucide-react";
import { toast } from "sonner";
import { googleLogin, sendCode, login as apiLogin } from "@/api/auth";
import { getErrorMessage } from "@/lib/errorMessage";

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const stateFrom =
    ((location.state as { from?: string } | null | undefined)?.from as string | undefined) || "";
  const redirectTo = stateFrom || "/";

  // 从 URL 或 state.from 读取推广码
  // 兼容场景: 未登录用户访问 /?ref=npX 时, ProtectedRoute 会重定向到 /login,
  // 此时新 URL 不带 ?ref=, 推广码只保留在 state.from 里
  const searchParams = new URLSearchParams(location.search);
  const fromQuery = stateFrom.includes("?") ? stateFrom.slice(stateFrom.indexOf("?")) : "";
  const referralCode =
    searchParams.get("ref") ||
    new URLSearchParams(fromQuery).get("ref") ||
    undefined;

  const toggleLanguage = () => {
    const currentBase = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
    const newLang = currentBase === "en" ? "zh" : "en";
    i18n.changeLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error(t("login.invalidEmail"));
      return;
    }
    setIsLoading(true);
    try {
      await sendCode({ email });
      setStep("code");
      setCountdown(60);
      setCode(["", "", "", "", "", ""]);
      toast.success(t("login.codeSent", { email }));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      const msg = getErrorMessage(err, "Failed");
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((c) => c !== "")) {
      handleVerify(newCode.join(""));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 0) return;
    const newCode = [...code];
    for (let i = 0; i < paste.length; i++) {
      newCode[i] = paste[i];
    }
    setCode(newCode);
    if (paste.length === 6) {
      handleVerify(paste);
    } else {
      inputRefs.current[Math.min(paste.length, 5)]?.focus();
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const codeStr = fullCode || code.join("");
    if (codeStr.length !== 6) {
      toast.error(t("login.invalidCode"));
      return;
    }
    setIsLoading(true);
    try {
      const params: { email: string; code: string; referral_code?: string } = {
        email,
        code: codeStr,
      };
      if (referralCode) {
        params.referral_code = referralCode;
      }
      const res = await apiLogin(params);
      login(email, res.access_token || "");
      toast.success(t("login.loginSuccess"));
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const msg = getErrorMessage(
        err,
        t("login.verifyFailed", { defaultValue: "Verification failed" })
      );
      toast.error(msg);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await sendCode({ email });
      setCountdown(60);
      toast.success(t("login.codeSent", { email }));
    } catch (err: any) {
      const msg = getErrorMessage(
        err,
        t("login.sendFailed", { defaultValue: "Failed to send, please try again." })
      );
      toast.error(msg);
    }
  };

  const handleGoogle = () => {
    googleLogin(redirectTo, referralCode);
  };

  return (
    <div className="min-h-screen bg-background bg-grid flex items-center justify-center p-4 relative overflow-hidden">
      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className="fixed top-5 right-5 h-8 px-2.5 flex items-center gap-1.5 bg-card border-brutal border-foreground hover:bg-secondary brutal-press text-[10px] font-bold uppercase z-50"
      >
        <Globe className="w-3 h-3" />
        {(i18n.resolvedLanguage || i18n.language || "en").split("-")[0] === "en"
          ? t("language.en", { defaultValue: "EN" })
          : t("language.zh", { defaultValue: "中文" })}
      </button>

      {/* Decorative elements — more subtle */}
      <div className="fixed top-10 left-10 w-12 h-12 bg-accent-yellow border-brutal border-foreground brutal-shadow rotate-12 hidden lg:flex items-center justify-center opacity-80">
        <Sparkles className="w-6 h-6" />
      </div>
      <div className="fixed bottom-16 right-16 w-10 h-10 bg-accent-cyan border-brutal border-foreground brutal-shadow -rotate-6 hidden lg:flex items-center justify-center opacity-80">
        <Zap className="w-5 h-5" />
      </div>
      <div className="fixed top-1/4 right-20 w-6 h-6 bg-accent-pink border-brutal border-foreground rotate-45 hidden lg:block opacity-60" />
      <div className="fixed bottom-1/3 left-20 w-8 h-8 bg-accent-green border-brutal border-foreground -rotate-12 hidden lg:block opacity-60" />

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-accent-cyan text-foreground flex items-center justify-center font-bold text-lg border-brutal border-foreground brutal-shadow-cyan">
            N
          </div>
          <span className="text-2xl font-bold tracking-tight">NEOSPARK</span>
        </div>

        {/* Login Card */}
        <div className="bg-card border-brutal border-foreground brutal-shadow p-7">
          {/* Header */}
          <div className="mb-7">
            <h1 className="text-xl font-bold uppercase tracking-widest mb-1.5">
              {t("login.title")}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("login.subtitle")}
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2">
                  {t("login.emailLabel")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                  className="w-full h-11 px-3 bg-background border-brutal border-foreground text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground/70"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-card text-foreground font-bold text-xs uppercase tracking-wider border-brutal border-foreground brutal-shadow brutal-press hover:bg-secondary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? `${t("login.sendCode")}...` : t("login.sendCode")}
              </button>
            </form>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-bold uppercase tracking-wider">{t("login.verifyTitle")}</h2>
                <p className="text-xs text-muted-foreground mt-1">{t("login.verifySubtitle", { email })}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2">
                  {t("login.codeLabel")}
                </label>
                <div className="grid grid-cols-6 gap-2" onPaste={handleCodePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      className="h-11 text-center bg-background border-brutal border-foreground text-base font-bold focus:outline-none focus:ring-0"
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleVerify()}
                disabled={isLoading}
                className="w-full h-11 bg-accent-cyan text-foreground font-bold text-xs uppercase tracking-wider border-brutal border-foreground brutal-shadow brutal-press hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? `${t("login.verify")}...` : t("login.verify")}
              </button>

              <div className="flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode(["", "", "", "", "", ""]);
                  }}
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  {t("login.backToEmail")}
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0}
                  className="font-semibold underline-offset-2 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? t("login.resendIn", { seconds: countdown }) : t("login.resend")}
                </button>
              </div>
            </div>
          )}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full h-11 bg-accent-cyan text-foreground font-bold text-xs uppercase tracking-wider border-brutal border-foreground brutal-shadow brutal-press hover:opacity-90 flex items-center justify-center gap-2"
            >
              {t("login.googleButton")}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground mt-5 font-mono">
          {t("login.footer")}
        </p>
      </div>
    </div>
  );
};

export default Login;
