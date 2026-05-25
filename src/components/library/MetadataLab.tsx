import { useEffect, useMemo, useState } from 'react';
import { Track } from '../../types';
import toast from 'react-hot-toast';

interface MetadataLabProps {
  track: Track;
  open: boolean;
  onClose: () => void;
  onSave?: (patch: Partial<Track>) => Promise<void>;
}
const MOOD_PRESETS = ['Night Drive', 'Workout', 'Chill', 'Focus', 'Cyberpunk', 'Bass Heavy', 'Vocals', 'Retro', 'Ambient', 'Hype', 'Podcast', 'Lo-Fi'];

export function MetadataLab({ track, open, onClose, onSave }: MetadataLabProps) {
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [form, setForm] = useState<Partial<Track>>({ title: track.title });
  useEffect(() => {
    if (!open) return;
    setForm({ ...track, tags: [...(track.tags || [])] });
    setTagInput('');
  }, [open, track]);
  const canSave = useMemo(() => !!form.title?.trim() && !saving, [form.title, saving]);
  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (t.length > 40) return toast.error('Tag too long');
    const next = Array.from(new Set([...(form.tags || []), t]));
    if (next.length > 20) return toast.error('Max 20 tags');
    setForm((s) => ({ ...s, tags: next }));
    setTagInput('');
  };
  const save = async () => {
    const title = (form.title || '').trim();
    if (!title) return toast.error('Title is required');
    if (onSave) {
      setSaving(true);
      try {
        await onSave({ ...form, title, tags: (form.tags || []).map((t) => t.trim()) });
        toast.success('Metadata saved');
        onClose();
      } catch {
        toast.error('Failed to save metadata');
      } finally {
        setSaving(false);
      }
    }
  };
  if (!open) return null;
  return <div className="fixed inset-0 z-[90] bg-black/80 p-3 md:p-6 backdrop-blur-sm"><div className="max-w-3xl mx-auto armored-frame bg-[#07080f] border-neo-cyan/40 p-4 md:p-6 max-h-[90vh] overflow-y-auto"><h2 className="text-2xl font-black italic tracking-widest text-neo-cyan">METADATA LAB</h2><p className="text-xs font-mono text-neo-magenta tracking-widest mb-4">TAG / ORGANIZE / INDEX</p>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <input aria-label="Title" value={form.title || ''} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Title" className="bg-black border border-gray-700 p-2" />
    <input aria-label="Artist" value={form.artist || ''} onChange={(e) => setForm((s) => ({ ...s, artist: e.target.value }))} placeholder="Artist" className="bg-black border border-gray-700 p-2" />
    <input aria-label="Album" value={form.album || ''} onChange={(e) => setForm((s) => ({ ...s, album: e.target.value }))} placeholder="Album" className="bg-black border border-gray-700 p-2" />
    <input aria-label="Genre" value={form.genre || ''} onChange={(e) => setForm((s) => ({ ...s, genre: e.target.value }))} placeholder="Genre" className="bg-black border border-gray-700 p-2" />
    <input aria-label="Mood" value={form.mood || ''} onChange={(e) => setForm((s) => ({ ...s, mood: e.target.value }))} placeholder="Mood" className="bg-black border border-gray-700 p-2" />
  </div>
  <div className="mt-3 flex flex-wrap gap-2">{MOOD_PRESETS.map((m)=><button key={m} onClick={()=>setForm((s)=>({...s,mood:m}))} className="px-2 py-1 text-xs border border-neo-cyan/40 hover:bg-neo-cyan/10">{m}</button>)}</div>
  <div className="mt-3"><div className="flex gap-2"><input aria-label="Tag input" value={tagInput} onChange={(e)=>setTagInput(e.target.value)} className="bg-black border border-gray-700 p-2 flex-1" /><button onClick={()=>addTag(tagInput)} className="px-3 border border-neo-magenta text-neo-magenta">Add Tag</button></div><div className="flex flex-wrap gap-2 mt-2">{(form.tags||[]).map(tag=><button key={tag} onClick={()=>setForm((s)=>({...s,tags:(s.tags||[]).filter(t=>t!==tag)}))} className="px-2 py-1 text-xs border border-gray-700">{tag} ×</button>)}</div></div>
  <textarea aria-label="Notes" value={form.notes || ''} onChange={(e)=>setForm((s)=>({...s,notes:e.target.value}))} className="w-full mt-3 bg-black border border-gray-700 p-2 min-h-[100px]" />
  <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-sm"><input type="checkbox" checked={!!form.favorite} onChange={(e)=>setForm((s)=>({...s,favorite:e.target.checked}))}/> Favorite</label><label className="text-sm"><input type="checkbox" checked={!!form.explicit} onChange={(e)=>setForm((s)=>({...s,explicit:e.target.checked}))}/> Explicit</label><select aria-label="Energy level" value={form.energyLevel || ''} onChange={(e)=>setForm((s)=>({...s,energyLevel:e.target.value ? Number(e.target.value) as any : undefined}))} className="bg-black border border-gray-700 p-2"><option value="">Energy Level</option>{[1,2,3,4,5].map((n)=><option key={n} value={n}>{n}</option>)}</select></div>
  <div className="mt-4 flex gap-2 justify-end"><button onClick={()=>setForm({ ...track, tags:[...(track.tags||[])]})} className="px-3 py-2 border border-gray-600">Reset changes</button><button onClick={onClose} className="px-3 py-2 border border-gray-600">Cancel</button><button disabled={!canSave} onClick={save} className="px-3 py-2 border border-neo-lime text-neo-lime disabled:opacity-40">Save</button></div>
  </div></div>;
}
