import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from '@phosphor-icons/react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';

const DocumentsPage = () => {
  const { t } = useTranslation();
  const documentsTitle = t('documents.title');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={documentsTitle}
        title={documentsTitle}
        description={t('documents.subtitle')}
        icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          <Button className="gap-2" disabled title={t('documents.coming_soon')}>
            <Plus className="h-4 w-4" /> {t('documents.add')}
          </Button>
        }
      />

      <div className="glass-card overflow-hidden">
        <EmptyState
          icon={FileText}
          title={t('documents.empty_title')}
          description={t('documents.empty_desc')}
        />
      </div>
    </div>
  );
};

export default DocumentsPage;
