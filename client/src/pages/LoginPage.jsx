import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LockClosedIcon,
  ShieldCheckIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import { authApi } from "../api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const highlights = [
  { icon: ShieldCheckIcon, label: "Protected access" },
  { icon: UserGroupIcon, label: "Real-time collaboration" },
  { icon: LockClosedIcon, label: "Private by default" }
];

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ emailOrUsername: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      login(data);
      toast.success("Welcome back.");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbf8fa_0%,#f4edf3_100%)] lg:grid lg:min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
      <section className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#582053_0%,#4A154B_100%)] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_24%)]" />

        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo-mark.svg" alt="CollabDrive logo" className="h-12 w-12 rounded-2xl ring-1 ring-white/12" />
          <div>
            <p className="text-3xl font-medium tracking-tight">CollabDrive</p>
            <p className="text-sm text-white/66">Enterprise collaboration</p>
          </div>
        </div>

        <div className="relative z-10 max-w-[420px]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#efc7da]">Secure access</p>
          <h1 className="mt-5 text-[4.1rem] font-medium leading-[0.94] tracking-[-0.05em]">Sign in and get back to work.</h1>
          <p className="mt-5 text-[17px] leading-8 text-white/72">Files, sharing, and live documents in one calm workspace.</p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2">
          {highlights.map(({ icon: Icon, label }) => (
            <div key={label} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm text-white/76 backdrop-blur-sm">
              <Icon className="h-4 w-4" />
              {label}
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center px-6 py-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[460px]">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <img src="/logo-mark.svg" alt="CollabDrive logo" className="h-11 w-11 rounded-2xl" />
              <div>
                <p className="text-3xl font-medium tracking-tight text-drive-text">CollabDrive</p>
                <p className="text-sm text-drive-subtext">Enterprise collaboration</p>
              </div>
            </div>
            <div className="ml-auto text-sm text-drive-subtext">
              Don&apos;t have an account? <Link className="font-medium text-drive-blue" to="/register">Create account</Link>
            </div>
          </div>

          <div className="max-w-[420px]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d174d]">Welcome back</p>
            <h2 className="mt-4 text-[3.4rem] font-medium leading-[0.95] tracking-[-0.05em] text-drive-text">Sign in</h2>
            <p className="mt-4 text-[15px] leading-7 text-drive-subtext">Use your email or username to continue.</p>
          </div>

          <form className="mt-10 max-w-[420px] space-y-5" onSubmit={handleSubmit}>
            <Input label="Email or username" value={form.emailOrUsername} onChange={(event) => setForm({ ...form, emailOrUsername: event.target.value })} className="h-13 rounded-[20px]" />
            <Input label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="h-13 rounded-[20px]" />
            <Button type="submit" className="mt-2 w-full justify-center py-3.5 text-[15px]" loading={loading}>Sign in</Button>
          </form>

          <div className="mt-8 max-w-[420px] border-t border-[#eadfe6] pt-5 text-sm text-drive-subtext">
            Secure authentication with role-based workspace access.
          </div>
        </div>
      </section>
    </div>
  );
};
