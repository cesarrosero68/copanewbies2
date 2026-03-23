import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { SkillsPlayer } from "@/lib/skillsTypes";
import { Trash2, Upload, Plus } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  players: SkillsPlayer[];
  onRefresh: () => void;
}

export default function PlayersTab({ players, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [club, setClub] = useState("");
  const [role, setRole] = useState<'field' | 'goalkeeper'>('field');

  const handleAdd = async () => {
    if (!num || !name || !club) return;
    const { error } = await supabase.from('skills_players' as any).insert({
      consecutive_number: parseInt(num),
      full_name: name,
      club,
      role,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNum(""); setName(""); setClub(""); setShowForm(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('skills_players' as any).update({ is_active: false }).eq('id', id);
    onRefresh();
  };

  const handleXlsx = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      const toInsert = rows.map(r => ({
        consecutive_number: parseInt(r['numero'] || r['consecutive_number'] || r['#'] || '0'),
        full_name: r['nombre'] || r['full_name'] || r['name'] || '',
        club: r['club'] || r['equipo'] || '',
        role: (r['rol'] || r['role'] || 'field').toLowerCase().includes('goal') ? 'goalkeeper' : 'field',
      })).filter(r => r.full_name);
      if (toInsert.length === 0) { toast({ title: "Sin datos", variant: "destructive" }); return; }
      const { error } = await supabase.from('skills_players' as any).insert(toInsert);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: `${toInsert.length} jugadores importados` });
      onRefresh();
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const active = players.filter(p => p.is_active);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
        <label>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXlsx} />
          <Button size="sm" variant="outline" asChild><span><Upload className="w-4 h-4 mr-1" /> Importar Excel</span></Button>
        </label>
      </div>

      {showForm && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 border rounded-md bg-muted/30">
          <div><Label>#</Label><Input value={num} onChange={e => setNum(e.target.value)} type="number" /></div>
          <div><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Club</Label><Input value={club} onChange={e => setClub(e.target.value)} /></div>
          <div>
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="field">Jugador</SelectItem>
                <SelectItem value="goalkeeper">Arquero</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button onClick={handleAdd}>OK</Button></div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Club</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {active.sort((a, b) => a.consecutive_number - b.consecutive_number).map(p => (
            <TableRow key={p.id}>
              <TableCell>{p.consecutive_number}</TableCell>
              <TableCell className="font-medium">{p.full_name}</TableCell>
              <TableCell>{p.club}</TableCell>
              <TableCell><Badge variant={p.role === 'goalkeeper' ? 'secondary' : 'default'}>{p.role === 'goalkeeper' ? 'Arquero' : 'Jugador'}</Badge></TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
