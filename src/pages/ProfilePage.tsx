import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Shield, Building2, Mail, Phone } from 'lucide-react';

const ProfilePage = () => {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-balance">Profil</h1>
        <p className="text-sm text-muted-foreground">Shaxsiy ma'lumotlar</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-balance">{user?.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <Shield className="h-3 w-3" />
                {user?.role === 'owner' ? 'Biznes egasi' : 'Filial menejeri'}
              </span>
              {user?.branch_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {user.branch_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Ism</Label>
            <Input defaultValue={user?.name} className="mt-1.5 bg-secondary border-border" />
          </div>
          <div>
            <Label>Email</Label>
            <Input defaultValue={user?.email} className="mt-1.5 bg-secondary border-border" />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input defaultValue={user?.phone || ''} className="mt-1.5 bg-secondary border-border" />
          </div>
        </div>

        <Button>Saqlash</Button>
      </div>

      {/* Change password */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-balance">Parolni o'zgartirish</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Joriy parol</Label>
            <Input type="password" className="mt-1.5 bg-secondary border-border" />
          </div>
          <div>
            <Label>Yangi parol</Label>
            <Input type="password" className="mt-1.5 bg-secondary border-border" />
          </div>
        </div>
        <Button variant="outline">Parolni yangilash</Button>
      </div>
    </div>
  );
};

export default ProfilePage;
