import { useParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { usePageBySlug } from '@/hooks/useSitePages';
import { usePublishedPages } from '@/hooks/useSitePages';
import { BlockRenderer } from '@/components/features/BlockRenderer';
import { useVenueConfig } from '@/hooks/useVenueConfig';

export default function CmsPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { page, blocks, loading, notFound } = usePageBySlug(slug);
  const { pages: allPages } = usePublishedPages();
  const { config: venue } = useVenueConfig();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-[#f8f8f5] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-5xl">🔍</p>
        <h1 className="text-2xl font-black text-[var(--brand-accent)]">Page not found</h1>
        <p className="text-gray-500 text-sm">This page may have been moved or is no longer available.</p>
        <Link to="/menu"
          className="mt-2 flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--brand-accent)] font-bold px-5 py-3 rounded-xl transition-all hover:opacity-90">
          <ArrowLeft className="w-4 h-4" /> Back to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f5]">
      {/* Minimal top bar */}
      <div className="bg-[var(--brand-accent)] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/menu" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> {venue.businessName || 'Menu'}
          </Link>
          <span className="text-white font-bold text-sm truncate max-w-[50vw]">{page.title}</span>
          <div className="w-24" /> {/* spacer to centre title */}
        </div>
      </div>

      {/* Page content */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {blocks.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-lg font-semibold">This page has no content yet.</p>
          </div>
        )}
        {blocks.map(block => (
          <div key={block.id}>
            <BlockRenderer block={block} pages={allPages} />
          </div>
        ))}
      </main>

      {/* Footer */}
      <footer className="bg-[var(--brand-accent)] mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-white/50 text-xs">
          <span>{venue.businessName}{venue.city ? ` · ${venue.city}` : ''}</span>
          <Link to="/menu" className="text-white/50 hover:text-white transition-colors">Order Online →</Link>
        </div>
      </footer>
    </div>
  );
}
