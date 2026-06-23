import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car } from "lucide-react";
import { toast } from "sonner";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          toast.success("Tizimga muvaffaqiyatli kirdingiz!");

          navigate("/dashboard");
        },
        onError: () => toast.error("Email yoki parol noto'g'ri"),
      },
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="glass-card w-full max-w-sm p-8 animate-slide-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center ">
            <img src="/favicon.png" alt="Logo" className="h-full w-full" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground text-balance">
            Auto Maktab CRM
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Tizimga kirish</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@autodrive.uz"
              className="mt-1.5 bg-secondary border-border"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Parol</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 bg-secondary border-border"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? "Kirilmoqda..." : "Kirish"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
