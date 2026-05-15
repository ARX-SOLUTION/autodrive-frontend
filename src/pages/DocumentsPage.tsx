import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileText } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/ui/PaginationControls';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';

const demoDocuments = [
  { id: '1', student_name: 'Karimov Jasur', doc_type: 'Haydovchilik guvohnomasi', status: '+', branch: 'Minor', date: '2024-03-01' },
  { id: '2', student_name: 'Aliyeva Madina', doc_type: 'Tibbiy ma\'lumotnoma', status: '-', branch: 'Minor', date: '2024-03-05' },
  { id: '3', student_name: 'Raximov Bobur', doc_type: 'Pasport nusxasi', status: '+', branch: 'Chorsu', date: '2024-03-08' },
];

const DocumentsPage = () => {
  const [search, setSearch] = useState('');
  const filtered = demoDocuments.filter((d) =>
    d.student_name.toLowerCase().includes(search.toLowerCase()) ||
    d.doc_type.toLowerCase().includes(search.toLowerCase())
  );
  const { currentPage, totalPages, paginatedItems, setCurrentPage } = usePagination(filtered);

  const startIndex = (currentPage - 1) * 10;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Hujjatlar</h1>
          <p className="text-sm text-muted-foreground">Talabalar hujjatlarini boshqarish</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Hujjat qo'shish</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
      </div>

      <div className="hidden md:block glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Talaba</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hujjat turi</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Holati</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Filial</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sana</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((d, idx) => (
              <tr key={d.id} className="table-row-striped border-b border-border/50">
                <td className="px-4 py-3 text-center text-muted-foreground">{startIndex + idx + 1}</td>
                <td className="px-4 py-3 font-medium">{d.student_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.doc_type}</td>
                <td className="px-4 py-3 text-center">
                  <span className={d.status === '+' ? 'text-success' : 'text-destructive'}>{d.status === '+' ? '✓' : '✗'}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{d.branch}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState icon={FileText} title="Hujjatlar topilmadi" />
        )}
      </div>

      <div className="md:hidden grid gap-3">
        {paginatedItems.length === 0 ? (
          <EmptyState icon={FileText} title="Hujjatlar topilmadi" />
        ) : (
          paginatedItems.map((d) => (
            <DataCard
              key={d.id}
              title={d.doc_type}
              subtitle={d.student_name}
              fields={[
                { label: "Turi", value: d.doc_type },
                { label: "Sana", value: d.date },
                { label: "Filial", value: d.branch ?? "—" },
                { label: "Holat", value: <span className={d.status === '+' ? 'text-success' : 'text-destructive'}>{d.status === '+' ? '✓' : '✗'}</span> },
              ]}
            />
          ))
        )}
      </div>

      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};

export default DocumentsPage;
