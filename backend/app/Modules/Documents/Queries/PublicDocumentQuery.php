<?php

namespace App\Modules\Documents\Queries;

use App\Modules\Documents\Models\Document;
use App\Modules\Documents\Models\DocumentFile;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class PublicDocumentQuery
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Document::query()
            ->published()
            ->with(['documentType', 'acronym', 'process']);

        $query->when(
            $filters['tipoDocumentoId'] ?? null,
            fn (Builder $builder, int $id): Builder => $builder->where('regulations_tipo', $id),
        );
        $query->when(
            $filters['siglaId'] ?? null,
            fn (Builder $builder, int $id): Builder => $builder->where('regulations_tipos_sigla_id', $id),
        );
        $query->when(
            $filters['procesoId'] ?? null,
            fn (Builder $builder, int $id): Builder => $builder->where('reg_process_id', $id),
        );
        $query->when(
            $filters['anio'] ?? null,
            fn (Builder $builder, string $year): Builder => $builder->where('reg_year', $year),
        );
        $query->when(
            $filters['numero'] ?? null,
            fn (Builder $builder, int $number): Builder => $builder->where('reg_num', $number),
        );
        $query->when(
            $filters['desde'] ?? null,
            fn (Builder $builder, string $date): Builder => $builder->whereDate('reg_date', '>=', $date),
        );
        $query->when(
            $filters['hasta'] ?? null,
            fn (Builder $builder, string $date): Builder => $builder->whereDate('reg_date', '<=', $date),
        );

        $this->applyTextFilter($query, $filters['texto'] ?? null);
        $this->applyOrder($query, $filters['orden'] ?? 'fechaDesc');

        return $query->paginate(
            perPage: (int) ($filters['porPagina'] ?? 25),
            pageName: 'pagina',
            page: (int) ($filters['pagina'] ?? 1),
        );
    }

    public function find(int $id): ?Document
    {
        return Document::query()
            ->published()
            ->with(['documentType', 'acronym', 'process'])
            ->find($id);
    }

    public function paginateFiles(int $documentId, array $filters): LengthAwarePaginator
    {
        return DocumentFile::query()
            ->where('file_idregulation', $documentId)
            ->whereHas('document', fn (Builder $document): Builder => $document->published())
            ->with('ocrState')
            ->orderBy('file_tomo')
            ->orderBy('file_nro_tipo')
            ->orderBy('id')
            ->paginate(
                perPage: (int) ($filters['porPagina'] ?? 50),
                pageName: 'pagina',
                page: (int) ($filters['pagina'] ?? 1),
            );
    }

    public function findFile(int $documentId, int $fileId): ?DocumentFile
    {
        return DocumentFile::query()
            ->whereKey($fileId)
            ->where('file_idregulation', $documentId)
            ->whereHas('document', fn (Builder $document): Builder => $document->published())
            ->with(['ocrState', 'activeArtifacts'])
            ->first();
    }

    private function applyTextFilter(Builder $query, ?string $text): void
    {
        $text = trim((string) $text);
        if ($text === '') {
            return;
        }

        $needle = '%'.mb_strtolower($text).'%';
        $query->where(function (Builder $nested) use ($needle): void {
            $nested
                ->whereRaw("LOWER(COALESCE(reg_title, '')) LIKE ?", [$needle])
                ->orWhereRaw("LOWER(COALESCE(reg_description, '')) LIKE ?", [$needle])
                ->orWhereRaw("LOWER(COALESCE(reg_observation, '')) LIKE ?", [$needle]);
        });
    }

    private function applyOrder(Builder $query, string $order): void
    {
        match ($order) {
            'fechaAsc' => $query->orderBy('reg_date')->orderBy('id'),
            'idDesc' => $query->orderByDesc('id'),
            default => $query->orderByDesc('reg_date')->orderByDesc('id'),
        };
    }
}
