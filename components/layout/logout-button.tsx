import { LogOut } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="ghost" size="sm" aria-label="Log out" title="Log out">
        <LogOut />
        <span className="hidden sm:inline">Log out</span>
      </Button>
    </form>
  );
}
