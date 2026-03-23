import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";
import { setStaffSession } from "@/lib/skillsTypes";

export default function SkillsLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.rpc('verify_skills_login', {
      p_username: username,
      p_password: password,
    } as any);

    if (error || !data || (data as any[]).length === 0) {
      toast({ title: "Error", description: "Usuario o contraseña incorrectos", variant: "destructive" });
    } else {
      const user = (data as any[])[0];
      setStaffSession({ user_id: user.user_id, user_name: user.user_name });
      navigate("/skills/staff");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/skills" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ChevronLeft className="w-4 h-4" />
            Volver a Skills
          </Link>
          <span className="text-4xl mb-2 block">🏒</span>
          <CardTitle className="font-display text-2xl uppercase">Skills Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Usuario</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
