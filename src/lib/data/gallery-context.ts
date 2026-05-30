type GalleryView = 'photos' | 'names';

type GalleryContext = {
  view: GalleryView;
  filter: string | null;
  photoX: number;
  photoY: number;
  namesScroll: number;
};

function parseNumber(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function readGalleryContext(searchParams: URLSearchParams): GalleryContext {
  const view = searchParams.get('view') === 'names' ? 'names' : 'photos';
  const filter = searchParams.get('filter');

  return {
    view,
    filter: filter && filter.trim() ? filter : null,
    photoX: parseNumber(searchParams.get('photoX')),
    photoY: parseNumber(searchParams.get('photoY')),
    namesScroll: parseNumber(searchParams.get('namesScroll')),
  };
}

export function buildGallerySearchParams(context: Partial<GalleryContext>): string {
  const params = new URLSearchParams();

  if (context.view) {
    params.set('view', context.view);
  }

  if (context.filter) {
    params.set('filter', context.filter);
  }

  if (context.view === 'names') {
    params.set('namesScroll', String(context.namesScroll ?? 0));
  } else {
    params.set('photoX', String(context.photoX ?? 0));
    params.set('photoY', String(context.photoY ?? 0));
  }

  return params.toString();
}

export function buildGalleryHref(context: Partial<GalleryContext> = {}): string {
  const search = buildGallerySearchParams(context);
  return search ? `/gallery?${search}` : '/gallery';
}

export { type GalleryContext };
