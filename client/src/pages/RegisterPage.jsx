import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FolderIcon,
  LockClosedIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import { authApi } from "../api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const highlights = [
  { icon: FolderIcon, label: "Structured storage" },
  { icon: UserGroupIcon, label: "Shared editing" },
  { icon: LockClosedIcon, label: "Access control" }
];

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      login(data);
      toast.success("Account created.");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed.");
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
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#efc7da]">Create workspace</p>
          <h1 className="mt-5 text-[4.1rem] font-medium leading-[0.94] tracking-[-0.05em]">Start with a secure account.</h1>
          <p className="mt-5 text-[17px] leading-8 text-white/72">Set up your profile and open a collaborative workspace in minutes.</p>
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
        <div className="mx-auto w-full max-w-[500px]">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <img src="/logo-mark.svg" alt="CollabDrive logo" className="h-11 w-11 rounded-2xl" />
              <div>
                <p className="text-3xl font-medium tracking-tight text-drive-text">CollabDrive</p>
                <p className="text-sm text-drive-subtext">Enterprise collaboration</p>
              </div>
            </div>
            <div className="ml-auto text-sm text-drive-subtext">
              Already have an account? <Link className="font-medium text-drive-blue" to="/login">Sign in</Link>
            </div>
          </div>

          <div className="max-w-[450px]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d174d]">Create account</p>
            <h2 className="mt-4 text-[3.4rem] font-medium leading-[0.95] tracking-[-0.05em] text-drive-text">Create account</h2>
            <p className="mt-4 text-[15px] leading-7 text-drive-subtext">Set up your profile to launch your workspace.</p>
          </div>

          <form className="mt-10 max-w-[450px] space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-13 rounded-[20px]" />
              <Input label="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="h-13 rounded-[20px]" />
            </div>
            <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="h-13 rounded-[20px]" />
            <Input label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="h-13 rounded-[20px]" />
            <Button type="submit" className="mt-2 w-full justify-center py-3.5 text-[15px]" loading={loading}>Create account</Button>
          </form>

          <div className="mt-8 max-w-[450px] border-t border-[#eadfe6] pt-5 text-sm text-drive-subtext">
            Secure signup with private-by-default workspace permissions.
          </div>
        </div>
      </section>
    </div>
  );
};
